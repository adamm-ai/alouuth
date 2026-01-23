import pool from '../config/database.js';

// Enroll in a course
export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Check if already enrolled
    const existingEnrollment = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course.' });
    }

    // Create enrollment
    await pool.query(
      'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)',
      [req.user.id, courseId]
    );

    res.status(201).json({ message: 'Successfully enrolled in course.' });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll in course.' });
  }
};

// Update lesson progress
export const updateLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { status, progressPercent, quizScore } = req.body;

    // Get lesson and course info
    const lessonResult = await pool.query(
      'SELECT id, course_id FROM lessons WHERE id = $1',
      [lessonId]
    );

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const lesson = lessonResult.rows[0];

    // Upsert progress
    const result = await pool.query(`
      INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, progress_percent, quiz_score, started_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        status = COALESCE($4, lesson_progress.status),
        progress_percent = COALESCE($5, lesson_progress.progress_percent),
        quiz_score = COALESCE($6, lesson_progress.quiz_score),
        quiz_attempts = CASE WHEN $6 IS NOT NULL THEN lesson_progress.quiz_attempts + 1 ELSE lesson_progress.quiz_attempts END,
        completed_at = CASE WHEN $4 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE lesson_progress.completed_at END,
        last_accessed = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.id, lessonId, lesson.course_id, status, progressPercent, quizScore]);

    // Check if course is completed
    const courseProgress = await calculateCourseProgress(req.user.id, lesson.course_id);

    if (courseProgress === 100) {
      await pool.query(`
        UPDATE enrollments
        SET completed_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND course_id = $2 AND completed_at IS NULL
      `, [req.user.id, lesson.course_id]);
    }

    res.json({
      message: 'Progress updated successfully',
      progress: result.rows[0],
      courseProgress
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress.' });
  }
};

// Mark lesson as complete
export const completeLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { quizScore } = req.body;

    const lessonResult = await pool.query(
      'SELECT id, course_id, type FROM lessons WHERE id = $1',
      [lessonId]
    );

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const lesson = lessonResult.rows[0];

    // Upsert completion
    await pool.query(`
      INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, progress_percent, quiz_score, completed_at, started_at)
      VALUES ($1, $2, $3, 'COMPLETED', 100, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        status = 'COMPLETED',
        progress_percent = 100,
        quiz_score = COALESCE($4, lesson_progress.quiz_score),
        quiz_attempts = CASE WHEN $4 IS NOT NULL THEN lesson_progress.quiz_attempts + 1 ELSE lesson_progress.quiz_attempts END,
        completed_at = CURRENT_TIMESTAMP,
        last_accessed = CURRENT_TIMESTAMP
    `, [req.user.id, lessonId, lesson.course_id, quizScore]);

    // Calculate course progress
    const courseProgress = await calculateCourseProgress(req.user.id, lesson.course_id);

    // Mark course as completed if 100%
    if (courseProgress === 100) {
      await pool.query(`
        UPDATE enrollments
        SET completed_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND course_id = $2 AND completed_at IS NULL
      `, [req.user.id, lesson.course_id]);
    }

    res.json({
      message: 'Lesson completed successfully',
      courseProgress
    });
  } catch (error) {
    console.error('Complete lesson error:', error);
    res.status(500).json({ error: 'Failed to complete lesson.' });
  }
};

// Get user's progress for a course
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    const progressResult = await pool.query(`
      SELECT
        lp.lesson_id,
        lp.status,
        lp.progress_percent,
        lp.quiz_score,
        lp.quiz_attempts,
        lp.completed_at,
        l.title as lesson_title,
        l.type as lesson_type
      FROM lesson_progress lp
      JOIN lessons l ON l.id = lp.lesson_id
      WHERE lp.user_id = $1 AND lp.course_id = $2
      ORDER BY l.order_index ASC
    `, [req.user.id, courseId]);

    const courseProgress = await calculateCourseProgress(req.user.id, courseId);

    res.json({
      courseProgress,
      lessons: progressResult.rows
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress.' });
  }
};

// Get user's overall dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    // Get enrolled courses count
    const enrolledResult = await pool.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1',
      [req.user.id]
    );

    // Get completed courses count
    const completedResult = await pool.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1 AND completed_at IS NOT NULL',
      [req.user.id]
    );

    // Get total lessons completed
    const lessonsResult = await pool.query(
      `SELECT COUNT(*) as count FROM lesson_progress WHERE user_id = $1 AND status = 'COMPLETED'`,
      [req.user.id]
    );

    // Get average quiz score
    const quizResult = await pool.query(
      'SELECT AVG(quiz_score) as avg_score FROM lesson_progress WHERE user_id = $1 AND quiz_score IS NOT NULL',
      [req.user.id]
    );

    // Get current courses with progress
    const currentCoursesResult = await pool.query(`
      SELECT
        c.id,
        c.title,
        c.thumbnail_url,
        e.enrolled_at,
        COUNT(CASE WHEN lp.status = 'COMPLETED' THEN 1 END)::int as completed_lessons,
        COUNT(l.id)::int as total_lessons
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN lessons l ON l.course_id = c.id AND l.is_published = true
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id
      WHERE e.user_id = $1 AND e.completed_at IS NULL
      GROUP BY c.id, c.title, c.thumbnail_url, e.enrolled_at
      ORDER BY e.enrolled_at DESC
      LIMIT 5
    `, [req.user.id]);

    res.json({
      stats: {
        enrolledCourses: parseInt(enrolledResult.rows[0].count),
        completedCourses: parseInt(completedResult.rows[0].count),
        lessonsCompleted: parseInt(lessonsResult.rows[0].count),
        averageQuizScore: Math.round(parseFloat(quizResult.rows[0].avg_score) || 0)
      },
      currentCourses: currentCoursesResult.rows.map(c => ({
        ...c,
        progress: c.total_lessons > 0 ? Math.round((c.completed_lessons / c.total_lessons) * 100) : 0
      }))
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats.' });
  }
};

// Helper function to calculate course progress
async function calculateCourseProgress(userId, courseId) {
  const result = await pool.query(`
    SELECT
      COUNT(l.id) as total_lessons,
      COUNT(CASE WHEN lp.status = 'COMPLETED' THEN 1 END) as completed_lessons
    FROM lessons l
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
    WHERE l.course_id = $2 AND l.is_published = true
  `, [userId, courseId]);

  const { total_lessons, completed_lessons } = result.rows[0];
  return total_lessons > 0 ? Math.round((completed_lessons / total_lessons) * 100) : 0;
}
