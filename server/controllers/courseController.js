import pool from '../config/database.js';

// Get all courses with lessons
export const getCourses = async (req, res) => {
  try {
    const coursesResult = await pool.query(`
      SELECT c.*,
             COUNT(DISTINCT e.user_id) as enrolled_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.is_published = true
      GROUP BY c.id
      ORDER BY c.order_index ASC, c.created_at DESC
    `);

    const courses = [];

    for (const course of coursesResult.rows) {
      // Get lessons for each course
      const lessonsResult = await pool.query(`
        SELECT l.*,
               (SELECT json_agg(json_build_object(
                 'id', q.id,
                 'question', q.question,
                 'options', q.options,
                 'correctAnswer', q.correct_answer,
                 'explanation', q.explanation
               ) ORDER BY q.order_index)
               FROM quiz_questions q WHERE q.lesson_id = l.id) as quiz
        FROM lessons l
        WHERE l.course_id = $1 AND l.is_published = true
        ORDER BY l.order_index ASC
      `, [course.id]);

      // Get user progress if authenticated
      let userProgress = null;
      let lessonProgressMap = {}; // Map lesson_id -> progress data

      if (req.user) {
        const progressResult = await pool.query(`
          SELECT lp.*
          FROM lesson_progress lp
          WHERE lp.user_id = $1 AND lp.course_id = $2
        `, [req.user.id, course.id]);

        // Build a map of lesson_id to progress for quick lookup
        progressResult.rows.forEach(p => {
          lessonProgressMap[p.lesson_id] = {
            status: p.status,
            isCompleted: p.status === 'COMPLETED',
            quizScore: p.quiz_score,
            passed: p.passed
          };
        });

        const completedLessons = progressResult.rows.filter(p => p.status === 'COMPLETED').length;
        const totalLessons = lessonsResult.rows.length;
        userProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      }

      courses.push({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail_url,
        level: course.level,
        totalDuration: course.total_duration,
        orderIndex: course.order_index,
        enrolledCount: parseInt(course.enrolled_count) || 0,
        progress: userProgress || 0,
        status: userProgress === 100 ? 'COMPLETED' : userProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        lessons: lessonsResult.rows.map(l => ({
          id: l.id,
          title: l.title,
          description: l.description,
          type: l.type,
          durationMin: l.duration_min,
          videoUrl: l.video_url,
          fileUrl: l.file_url,
          fileName: l.file_name,
          pageCount: l.page_count,
          content: l.content,
          quiz: l.quiz || [],
          isCompleted: lessonProgressMap[l.id]?.isCompleted || false,
          quizScore: lessonProgressMap[l.id]?.quizScore,
          passed: lessonProgressMap[l.id]?.passed
        }))
      });
    }

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses.' });
  }
};

// Get single course by ID
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const courseResult = await pool.query(`
      SELECT c.*,
             COUNT(DISTINCT e.user_id) as enrolled_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const course = courseResult.rows[0];

    // Get lessons
    const lessonsResult = await pool.query(`
      SELECT l.*,
             (SELECT json_agg(json_build_object(
               'id', q.id,
               'question', q.question,
               'options', q.options,
               'correctAnswer', q.correct_answer,
               'explanation', q.explanation
             ) ORDER BY q.order_index)
             FROM quiz_questions q WHERE q.lesson_id = l.id) as quiz
      FROM lessons l
      WHERE l.course_id = $1
      ORDER BY l.order_index ASC
    `, [id]);

    // Get user progress if authenticated
    let lessonProgress = {};
    if (req.user) {
      const progressResult = await pool.query(`
        SELECT lesson_id, status, quiz_score
        FROM lesson_progress
        WHERE user_id = $1 AND course_id = $2
      `, [req.user.id, id]);

      progressResult.rows.forEach(p => {
        lessonProgress[p.lesson_id] = {
          status: p.status,
          quizScore: p.quiz_score
        };
      });
    }

    res.json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail_url,
        level: course.level,
        totalDuration: course.total_duration,
        orderIndex: course.order_index,
        enrolledCount: parseInt(course.enrolled_count) || 0,
        lessons: lessonsResult.rows.map(l => ({
          id: l.id,
          title: l.title,
          description: l.description,
          type: l.type,
          durationMin: l.duration_min,
          videoUrl: l.video_url,
          fileUrl: l.file_url,
          fileName: l.file_name,
          pageCount: l.page_count,
          content: l.content,
          quiz: l.quiz || [],
          isCompleted: lessonProgress[l.id]?.status === 'COMPLETED',
          quizScore: lessonProgress[l.id]?.quizScore
        }))
      }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course.' });
  }
};

// Create course (Admin only)
export const createCourse = async (req, res) => {
  try {
    const { title, description, level, thumbnailUrl, totalDuration } = req.body;
    const courseLevel = level || 'Beginner';

    // Calculate next order_index for this level
    const maxOrderResult = await pool.query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM courses WHERE level = $1',
      [courseLevel]
    );
    const orderIndex = maxOrderResult.rows[0].next_order;

    const result = await pool.query(`
      INSERT INTO courses (title, description, level, thumbnail_url, total_duration, created_by, is_published, order_index)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      RETURNING *
    `, [title, description, courseLevel, thumbnailUrl, totalDuration, req.user.id, orderIndex]);

    const course = result.rows[0];

    // Return course in the same format as getCourseById
    res.status(201).json({
      message: 'Course created successfully',
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail_url,
        level: course.level,
        totalDuration: course.total_duration,
        orderIndex: course.order_index,
        enrolledCount: 0,
        progress: 0,
        status: 'NOT_STARTED',
        lessons: []
      }
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course.' });
  }
};

// Update course (Admin only)
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, level, thumbnailUrl, totalDuration, isPublished, orderIndex } = req.body;

    const result = await pool.query(`
      UPDATE courses
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          level = COALESCE($3, level),
          thumbnail_url = COALESCE($4, thumbnail_url),
          total_duration = COALESCE($5, total_duration),
          is_published = COALESCE($6, is_published),
          order_index = COALESCE($7, order_index),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [title, description, level, thumbnailUrl, totalDuration, isPublished, orderIndex, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const course = result.rows[0];

    // Fetch lessons to include in response
    const lessonsResult = await pool.query(`
      SELECT l.*,
             (SELECT json_agg(json_build_object(
               'id', q.id,
               'question', q.question,
               'options', q.options,
               'correctAnswer', q.correct_answer,
               'explanation', q.explanation
             ) ORDER BY q.order_index)
             FROM quiz_questions q WHERE q.lesson_id = l.id) as quiz
      FROM lessons l
      WHERE l.course_id = $1
      ORDER BY l.order_index ASC
    `, [id]);

    res.json({
      message: 'Course updated successfully',
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail_url,
        level: course.level,
        totalDuration: course.total_duration,
        orderIndex: course.order_index,
        enrolledCount: 0,
        lessons: lessonsResult.rows.map(l => ({
          id: l.id,
          title: l.title,
          description: l.description,
          type: l.type,
          durationMin: l.duration_min,
          videoUrl: l.video_url,
          videoSource: l.video_source,
          fileUrl: l.file_url,
          fileName: l.file_name,
          pageCount: l.page_count,
          content: l.content,
          quiz: l.quiz || []
        }))
      }
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course.' });
  }
};

// Delete course (Admin only)
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    res.json({ message: 'Course deleted successfully.' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course.' });
  }
};

// Reorder courses within a level (Admin only)
export const reorderCourses = async (req, res) => {
  const client = await pool.connect();
  try {
    const { level, orderedIds } = req.body;

    // Validate level
    const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: 'Invalid level. Must be Beginner, Intermediate, or Advanced.' });
    }

    // Validate orderedIds is an array
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array of course IDs.' });
    }

    await client.query('BEGIN');

    // Update order_index for each course in the provided order
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE courses SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND level = $3',
        [i, orderedIds[i], level]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Courses reordered successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reorder courses error:', error);
    res.status(500).json({ error: 'Failed to reorder courses.' });
  } finally {
    client.release();
  }
};

// Add lesson to course (Admin only)
export const addLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      description,
      type,
      durationMin,
      videoUrl,
      videoSource,
      fileUrl,
      fileName,
      pageCount,
      content,
      isExternalLink,
      orderIndex,
      quiz
    } = req.body;

    // Get max order index if not provided
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const maxOrder = await pool.query(
        'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM lessons WHERE course_id = $1',
        [courseId]
      );
      finalOrderIndex = maxOrder.rows[0].next_order;
    }

    const result = await pool.query(`
      INSERT INTO lessons (
        course_id, title, description, type, duration_min,
        video_url, video_source, file_url, file_name, page_count,
        content, is_external_link, order_index
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      courseId, title, description, type, durationMin || 0,
      videoUrl, videoSource, fileUrl, fileName, pageCount,
      content, isExternalLink || false, finalOrderIndex
    ]);

    const lesson = result.rows[0];

    // If quiz questions were provided, create them
    let savedQuiz = [];
    if (quiz && Array.isArray(quiz) && quiz.length > 0) {
      for (let i = 0; i < quiz.length; i++) {
        const q = quiz[i];
        if (q.question && q.options) {
          // Validate options count: must be between 2 and 6
          if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
            return res.status(400).json({
              error: `Question ${i + 1}: Options must be between 2 and 6. Got ${q.options?.length || 0}.`
            });
          }
          // Validate correctAnswer is within bounds
          const correctAnswer = q.correctAnswer || 0;
          if (correctAnswer < 0 || correctAnswer >= q.options.length) {
            return res.status(400).json({
              error: `Question ${i + 1}: Correct answer index out of bounds.`
            });
          }
          const quizResult = await pool.query(`
            INSERT INTO quiz_questions (lesson_id, question, options, correct_answer, explanation, order_index)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [lesson.id, q.question, JSON.stringify(q.options), correctAnswer, q.explanation || null, i]);

          const savedQ = quizResult.rows[0];
          savedQuiz.push({
            id: savedQ.id,
            question: savedQ.question,
            options: savedQ.options,
            correctAnswer: savedQ.correct_answer,
            explanation: savedQ.explanation
          });
        }
      }
    }

    // Return lesson in camelCase format
    res.status(201).json({
      message: 'Lesson added successfully',
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        durationMin: lesson.duration_min,
        videoUrl: lesson.video_url,
        videoSource: lesson.video_source,
        fileUrl: lesson.file_url,
        fileName: lesson.file_name,
        pageCount: lesson.page_count,
        content: lesson.content,
        quiz: savedQuiz
      }
    });
  } catch (error) {
    console.error('Add lesson error:', error);
    res.status(500).json({ error: 'Failed to add lesson.' });
  }
};

// Update lesson (Admin only)
export const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const updates = req.body;
    const { quiz } = updates;

    const setClauses = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'title', 'description', 'type', 'duration_min', 'video_url',
      'video_source', 'file_url', 'file_name', 'page_count', 'content',
      'is_external_link', 'order_index', 'is_published'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'quiz') continue; // Handle quiz separately
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    // Update lesson fields if there are any
    let lesson;
    if (setClauses.length > 0) {
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      values.push(lessonId);

      const result = await pool.query(`
        UPDATE lessons
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lesson not found.' });
      }
      lesson = result.rows[0];
    } else {
      // Just fetch the lesson if no fields to update
      const result = await pool.query('SELECT * FROM lessons WHERE id = $1', [lessonId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lesson not found.' });
      }
      lesson = result.rows[0];
    }

    // Handle quiz synchronization if quiz array is provided
    let savedQuiz = [];
    if (quiz !== undefined && Array.isArray(quiz)) {
      // Get existing quiz questions for this lesson
      const existingQuizResult = await pool.query(
        'SELECT id FROM quiz_questions WHERE lesson_id = $1',
        [lessonId]
      );
      const existingIds = existingQuizResult.rows.map(q => q.id);

      // Track which IDs from the new quiz are real (not temp IDs starting with 'q-')
      const newQuizRealIds = quiz.filter(q => q.id && !q.id.startsWith('q-')).map(q => q.id);

      // Delete quiz questions that are no longer in the new quiz
      const idsToDelete = existingIds.filter(id => !newQuizRealIds.includes(id));
      for (const idToDelete of idsToDelete) {
        await pool.query('DELETE FROM quiz_questions WHERE id = $1', [idToDelete]);
      }

      // Update existing questions and add new ones
      for (let i = 0; i < quiz.length; i++) {
        const q = quiz[i];
        if (!q.question && (!q.options || q.options.length === 0)) {
          continue; // Skip empty questions
        }

        // Validate options count: must be between 2 and 6
        if (q.options && (q.options.length < 2 || q.options.length > 6)) {
          return res.status(400).json({
            error: `Question ${i + 1}: Options must be between 2 and 6. Got ${q.options.length}.`
          });
        }
        // Validate correctAnswer is within bounds
        const correctAnswer = q.correctAnswer || 0;
        if (q.options && (correctAnswer < 0 || correctAnswer >= q.options.length)) {
          return res.status(400).json({
            error: `Question ${i + 1}: Correct answer index out of bounds.`
          });
        }

        const isNewQuestion = !q.id || q.id.startsWith('q-');

        if (isNewQuestion) {
          // Insert new question
          const insertResult = await pool.query(`
            INSERT INTO quiz_questions (lesson_id, question, options, correct_answer, explanation, order_index)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [lessonId, q.question || '', JSON.stringify(q.options || []), correctAnswer, q.explanation || null, i]);

          const savedQ = insertResult.rows[0];
          savedQuiz.push({
            id: savedQ.id,
            question: savedQ.question,
            options: savedQ.options,
            correctAnswer: savedQ.correct_answer,
            explanation: savedQ.explanation
          });
        } else {
          // Update existing question
          const updateResult = await pool.query(`
            UPDATE quiz_questions
            SET question = $1, options = $2, correct_answer = $3, explanation = $4, order_index = $5
            WHERE id = $6
            RETURNING *
          `, [q.question || '', JSON.stringify(q.options || []), correctAnswer, q.explanation || null, i, q.id]);

          if (updateResult.rows.length > 0) {
            const savedQ = updateResult.rows[0];
            savedQuiz.push({
              id: savedQ.id,
              question: savedQ.question,
              options: savedQ.options,
              correctAnswer: savedQ.correct_answer,
              explanation: savedQ.explanation
            });
          }
        }
      }
    } else {
      // Fetch existing quiz if not updating
      const quizResult = await pool.query(
        'SELECT * FROM quiz_questions WHERE lesson_id = $1 ORDER BY order_index',
        [lessonId]
      );
      savedQuiz = quizResult.rows.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation
      }));
    }

    // Return lesson in camelCase format
    res.json({
      message: 'Lesson updated successfully',
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        durationMin: lesson.duration_min,
        videoUrl: lesson.video_url,
        videoSource: lesson.video_source,
        fileUrl: lesson.file_url,
        fileName: lesson.file_name,
        pageCount: lesson.page_count,
        content: lesson.content,
        quiz: savedQuiz
      }
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson.' });
  }
};

// Delete lesson (Admin only)
export const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING id', [lessonId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    res.json({ message: 'Lesson deleted successfully.' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Failed to delete lesson.' });
  }
};

// Add quiz question to lesson (Admin only)
export const addQuizQuestion = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { question, options, correctAnswer, explanation, orderIndex } = req.body;

    // Validate options count: must be between 2 and 6
    if (!options || !Array.isArray(options) || options.length < 2 || options.length > 6) {
      return res.status(400).json({
        error: `Options must be between 2 and 6. Got ${options?.length || 0}.`
      });
    }
    // Validate correctAnswer is within bounds
    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({
        error: 'Correct answer index out of bounds.'
      });
    }

    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const maxOrder = await pool.query(
        'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM quiz_questions WHERE lesson_id = $1',
        [lessonId]
      );
      finalOrderIndex = maxOrder.rows[0].next_order;
    }

    const result = await pool.query(`
      INSERT INTO quiz_questions (lesson_id, question, options, correct_answer, explanation, order_index)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [lessonId, question, JSON.stringify(options), correctAnswer, explanation, finalOrderIndex]);

    res.status(201).json({
      message: 'Quiz question added successfully',
      question: result.rows[0]
    });
  } catch (error) {
    console.error('Add quiz question error:', error);
    res.status(500).json({ error: 'Failed to add quiz question.' });
  }
};

// Update quiz question (Admin only)
export const updateQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { question, options, correctAnswer, explanation, orderIndex } = req.body;

    // Validate options count if provided: must be between 2 and 6
    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
        return res.status(400).json({
          error: `Options must be between 2 and 6. Got ${options?.length || 0}.`
        });
      }
      // Validate correctAnswer is within bounds if both are provided
      if (correctAnswer !== undefined && (correctAnswer < 0 || correctAnswer >= options.length)) {
        return res.status(400).json({
          error: 'Correct answer index out of bounds.'
        });
      }
    }

    const result = await pool.query(`
      UPDATE quiz_questions
      SET question = COALESCE($1, question),
          options = COALESCE($2, options),
          correct_answer = COALESCE($3, correct_answer),
          explanation = COALESCE($4, explanation),
          order_index = COALESCE($5, order_index)
      WHERE id = $6
      RETURNING *
    `, [question, options ? JSON.stringify(options) : null, correctAnswer, explanation, orderIndex, questionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    res.json({
      message: 'Question updated successfully',
      question: result.rows[0]
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Failed to update question.' });
  }
};

// Delete quiz question (Admin only)
export const deleteQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const result = await pool.query('DELETE FROM quiz_questions WHERE id = $1 RETURNING id', [questionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    res.json({ message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Failed to delete question.' });
  }
};
