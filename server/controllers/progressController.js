import pool from '../config/database.js';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// Helper: Check if user can access a course based on unlock rules
// RULES:
// 1. First course in each level is unlocked (if previous level is complete)
// 2. Courses unlock sequentially until 2 are completed
// 3. After completing 2 courses in a level → ALL courses in that level unlock
// 4. After completing ALL courses in a level → first course of next level unlocks
async function checkPrerequisites(userId, courseId) {
  // Get the target course info
  let courseResult;
  try {
    courseResult = await pool.query(`
      SELECT c.id, c.level, c.order_index, c.title
      FROM courses c
      WHERE c.id = $1
    `, [courseId]);
  } catch (e) {
    console.error('Error fetching course:', e);
    courseResult = await pool.query(`
      SELECT id, level FROM courses WHERE id = $1
    `, [courseId]);
  }

  if (courseResult.rows.length === 0) {
    return { allowed: false, reason: 'Course not found' };
  }

  const course = courseResult.rows[0];
  const courseLevel = course.level;
  const levelIndex = LEVELS.indexOf(courseLevel);

  // Get all courses in this level, sorted by order_index
  const levelCoursesResult = await pool.query(`
    SELECT c.id, c.title, c.order_index
    FROM courses c
    WHERE c.level = $1 AND c.is_published = true
    ORDER BY c.order_index ASC
  `, [courseLevel]);

  const levelCourses = levelCoursesResult.rows;
  const courseIndexInLevel = levelCourses.findIndex(c => c.id === courseId);

  // Get user's completed courses in this level
  const completedInLevelResult = await pool.query(`
    SELECT c.id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = $1 AND c.level = $2 AND e.completed_at IS NOT NULL
  `, [userId, courseLevel]);

  const completedInLevel = completedInLevelResult.rows.length;

  // Check if previous level is fully complete (required for non-Beginner levels)
  if (levelIndex > 0) {
    const previousLevel = LEVELS[levelIndex - 1];

    // Get total courses in previous level
    const prevLevelTotalResult = await pool.query(`
      SELECT COUNT(*) as count FROM courses WHERE level = $1 AND is_published = true
    `, [previousLevel]);
    const prevLevelTotal = parseInt(prevLevelTotalResult.rows[0].count);

    // Get completed courses in previous level
    const prevLevelCompletedResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = $1 AND c.level = $2 AND e.completed_at IS NOT NULL
    `, [userId, previousLevel]);
    const prevLevelCompleted = parseInt(prevLevelCompletedResult.rows[0].count);

    // Previous level must be fully complete
    if (prevLevelTotal > 0 && prevLevelCompleted < prevLevelTotal) {
      return {
        allowed: false,
        reason: `Complete all ${previousLevel} courses first (${prevLevelCompleted}/${prevLevelTotal} done)`
      };
    }
  }

  // Rule: If 2+ courses completed in this level → ALL courses in this level are unlocked
  if (completedInLevel >= 2) {
    return { allowed: true };
  }

  // Rule: First course in level is always unlocked (if previous level complete)
  if (courseIndexInLevel === 0) {
    return { allowed: true };
  }

  // Rule: Sequential unlock - check if previous course in level is complete
  const previousCourse = levelCourses[courseIndexInLevel - 1];
  if (previousCourse) {
    const prevCourseCompletedResult = await pool.query(`
      SELECT e.id FROM enrollments e
      WHERE e.user_id = $1 AND e.course_id = $2 AND e.completed_at IS NOT NULL
    `, [userId, previousCourse.id]);

    if (prevCourseCompletedResult.rows.length === 0) {
      return {
        allowed: false,
        reason: `Complete "${previousCourse.title}" first`
      };
    }
  }

  return { allowed: true };
}

// Helper: Check if quiz score passes the threshold
function checkQuizPassed(score, totalQuestions, passingScore = 70) {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  return {
    passed: percentage >= passingScore,
    percentage,
    passingScore
  };
}

// Enroll in a course with prerequisite checking
export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    let courseCheck;
    try {
      courseCheck = await pool.query(
        'SELECT id, deadline, is_mandatory FROM courses WHERE id = $1',
        [courseId]
      );
    } catch (e) {
      if (e.code === '42703') { // PostgreSQL "column does not exist"
        console.warn('Deadline or mandatory column missing in courses table, falling back');
        courseCheck = await pool.query(
          'SELECT id FROM courses WHERE id = $1',
          [courseId]
        );
      } else {
        throw e;
      }
    }

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const course = courseCheck.rows[0];

    // Check prerequisites
    const prereqResult = await checkPrerequisites(req.user.id, courseId);
    if (!prereqResult.allowed) {
      return res.status(403).json({
        error: prereqResult.reason,
        prerequisiteCourseId: prereqResult.prerequisiteCourseId
      });
    }

    // Check if already enrolled
    const existingEnrollment = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course.' });
    }

    // Create enrollment with course deadline if set
    try {
      await pool.query(
        'INSERT INTO enrollments (user_id, course_id, deadline) VALUES ($1, $2, $3)',
        [req.user.id, courseId, course.deadline]
      );
    } catch (e) {
      if (e.code === '42703') { // PostgreSQL "column does not exist"
        console.warn('Deadline column missing in enrollments table, enrolling without it');
        await pool.query(
          'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)',
          [req.user.id, courseId]
        );
      } else {
        throw e;
      }
    }

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

// Mark lesson as complete with quiz pass/fail validation
export const completeLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { quizScore, totalQuestions } = req.body;

    let lessonResult;
    try {
      lessonResult = await pool.query(
        'SELECT id, course_id, type, passing_score FROM lessons WHERE id = $1',
        [lessonId]
      );
    } catch (e) {
      if (e.code === '42703') { // PostgreSQL "column does not exist"
        console.warn('Passing score column missing in lessons table, falling back');
        lessonResult = await pool.query(
          'SELECT id, course_id, type FROM lessons WHERE id = $1',
          [lessonId]
        );
      } else {
        throw e;
      }
    }

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const lesson = lessonResult.rows[0];
    const passingScore = lesson.passing_score || 70;

    // For quiz lessons, validate pass/fail
    let passed = true;
    let quizResult = null;

    if (lesson.type === 'quiz' && quizScore !== undefined && totalQuestions) {
      quizResult = checkQuizPassed(quizScore, totalQuestions, passingScore);
      passed = quizResult.passed;

      // If quiz not passed, don't mark as completed
      if (!passed) {
        // Still record the attempt - handle possible missing passed column
        try {
          await pool.query(`
            INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, progress_percent, quiz_score, passed, started_at)
            VALUES ($1, $2, $3, 'IN_PROGRESS', 0, $4, false, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, lesson_id)
            DO UPDATE SET
              quiz_score = $4,
              quiz_attempts = lesson_progress.quiz_attempts + 1,
              passed = false,
              last_accessed = CURRENT_TIMESTAMP
          `, [req.user.id, lessonId, lesson.course_id, quizResult.percentage]);
        } catch (e) {
          if (e.code === '42703') { // PostgreSQL "column does not exist"
            console.warn('Failed to save passed status, retrying without it');
            await pool.query(`
              INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, progress_percent, quiz_score, started_at)
              VALUES ($1, $2, $3, 'IN_PROGRESS', 0, $4, CURRENT_TIMESTAMP)
              ON CONFLICT (user_id, lesson_id)
              DO UPDATE SET
                quiz_score = $4,
                quiz_attempts = lesson_progress.quiz_attempts + 1,
                last_accessed = CURRENT_TIMESTAMP
            `, [req.user.id, lessonId, lesson.course_id, quizResult.percentage]);
          } else {
            throw e;
          }
        }

        return res.json({
          message: 'Quiz not passed',
          passed: false,
          quizResult,
          courseProgress: await calculateCourseProgress(req.user.id, lesson.course_id)
        });
      }
    }

    // Upsert completion (passed or non-quiz lesson) - handle possible missing passed column
    const scoreToStore = quizResult ? quizResult.percentage : quizScore;

    try {
      await pool.query(`
        INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, progress_percent, quiz_score, passed, completed_at, started_at)
        VALUES ($1, $2, $3, 'COMPLETED', 100, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, lesson_id)
        DO UPDATE SET
          status = 'COMPLETED',
          progress_percent = 100,
          quiz_score = COALESCE($4, lesson_progress.quiz_score),
          passed = $5,
          quiz_attempts = CASE WHEN $4 IS NOT NULL THEN lesson_progress.quiz_attempts + 1 ELSE lesson_progress.quiz_attempts END,
          completed_at = CURRENT_TIMESTAMP,
          last_accessed = CURRENT_TIMESTAMP
      `, [req.user.id, lessonId, lesson.course_id, scoreToStore, passed]);
    } catch (e) {
      if (e.code === '42703') { // PostgreSQL "column does not exist"
        console.warn('Failed to save passed status during completion, retrying without it');
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
        `, [req.user.id, lessonId, lesson.course_id, scoreToStore]);
      } else {
        throw e;
      }
    }

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
      passed: true,
      quizResult,
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

// Check if user can access a course (prerequisites check)
export const checkCourseAccess = async (req, res) => {
  try {
    const { courseId } = req.params;
    const prereqResult = await checkPrerequisites(req.user.id, courseId);

    res.json({
      canAccess: prereqResult.allowed,
      reason: prereqResult.reason,
      prerequisiteCourseId: prereqResult.prerequisiteCourseId
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ error: 'Failed to check course access.' });
  }
};

// Get user's courses with deadline status
export const getDeadlines = async (req, res) => {
  try {
    let result;
    try {
      result = await pool.query(`
        SELECT
          e.id as enrollment_id,
          c.id as course_id,
          c.title,
          c.is_mandatory,
          COALESCE(e.deadline, c.deadline) as deadline,
          e.completed_at,
          e.enrolled_at,
          CASE
            WHEN e.completed_at IS NOT NULL THEN 'completed'
            WHEN COALESCE(e.deadline, c.deadline) IS NULL THEN 'no_deadline'
            WHEN COALESCE(e.deadline, c.deadline) < NOW() THEN 'overdue'
            WHEN COALESCE(e.deadline, c.deadline) < NOW() + INTERVAL '7 days' THEN 'urgent'
            WHEN COALESCE(e.deadline, c.deadline) < NOW() + INTERVAL '14 days' THEN 'upcoming'
            ELSE 'on_track'
          END as status,
          EXTRACT(DAY FROM COALESCE(e.deadline, c.deadline) - NOW())::int as days_remaining
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        WHERE e.user_id = $1
        ORDER BY
          CASE WHEN e.completed_at IS NOT NULL THEN 1 ELSE 0 END,
          COALESCE(e.deadline, c.deadline) ASC NULLS LAST
      `, [req.user.id]);
    } catch (e) {
      if (e.code === '42703') { // PostgreSQL "column does not exist"
        console.warn('Deadline columns missing in getDeadlines, falling back');
        result = await pool.query(`
          SELECT
            e.id as enrollment_id,
            c.id as course_id,
            c.title,
            e.completed_at,
            e.enrolled_at,
            CASE
              WHEN e.completed_at IS NOT NULL THEN 'completed'
              ELSE 'on_track'
            END as status
          FROM enrollments e
          JOIN courses c ON c.id = e.course_id
          WHERE e.user_id = $1
          ORDER BY
            CASE WHEN e.completed_at IS NOT NULL THEN 1 ELSE 0 END,
            e.enrolled_at DESC
        `, [req.user.id]);
      } else {
        throw e;
      }
    }

    // Update overdue status in enrollments
    try {
      await pool.query(`
        UPDATE enrollments
        SET is_overdue = true
        WHERE user_id = $1
          AND completed_at IS NULL
          AND (deadline < NOW() OR course_id IN (
            SELECT id FROM courses WHERE deadline < NOW()
          ))
      `, [req.user.id]);
    } catch (e) {
      if (e.code === '42703') { // PostgreSQL "column does not exist"
        console.warn('Deadline or is_overdue column missing during update, skipping');
      } else {
        throw e;
      }
    }

    res.json({
      deadlines: result.rows.map(row => ({
        enrollmentId: row.enrollment_id,
        courseId: row.course_id,
        title: row.title,
        isMandatory: row.is_mandatory,
        deadline: row.deadline,
        completedAt: row.completed_at,
        enrolledAt: row.enrolled_at,
        status: row.status,
        daysRemaining: row.days_remaining
      }))
    });
  } catch (error) {
    console.error('Get deadlines error:', error);
    res.status(500).json({ error: 'Failed to get deadlines.' });
  }
};

// Get lesson passing requirements
export const getLessonRequirements = async (req, res) => {
  try {
    const { lessonId } = req.params;

    let result;
    try {
      result = await pool.query(`
        SELECT
          l.id,
          l.title,
          l.type,
          l.passing_score,
          lp.quiz_score,
          lp.quiz_attempts,
          lp.passed,
          lp.status
        FROM lessons l
        LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
        WHERE l.id = $2
      `, [req.user.id, lessonId]);
    } catch (e) {
      if (e.code === '42703') { // PostgreSQL "column does not exist"
        console.warn('Passed or passing_score column missing in requirements check, retrying without them');
        result = await pool.query(`
          SELECT
            l.id,
            l.title,
            l.type,
            lp.quiz_score,
            lp.quiz_attempts,
            lp.status
          FROM lessons l
          LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
          WHERE l.id = $2
        `, [req.user.id, lessonId]);
      } else {
        throw e;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const lesson = result.rows[0];

    res.json({
      lessonId: lesson.id,
      title: lesson.title,
      type: lesson.type,
      passingScore: lesson.passing_score || 70,
      currentScore: lesson.quiz_score,
      attempts: lesson.quiz_attempts || 0,
      passed: lesson.passed || false,
      status: lesson.status || 'NOT_STARTED'
    });
  } catch (error) {
    console.error('Get lesson requirements error:', error);
    res.status(500).json({ error: 'Failed to get lesson requirements.' });
  }
};
