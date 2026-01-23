import pool from '../config/database.js';

// Get admin dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    // Total learners
    const learnersResult = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE role IN ('LEARNER', 'SUPERUSER')`
    );

    // Total courses
    const coursesResult = await pool.query('SELECT COUNT(*) as count FROM courses');

    // Total lessons
    const lessonsResult = await pool.query('SELECT COUNT(*) as count FROM lessons');

    // Total enrollments
    const enrollmentsResult = await pool.query('SELECT COUNT(*) as count FROM enrollments');

    // Completed enrollments
    const completedResult = await pool.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE completed_at IS NOT NULL'
    );

    // Average completion rate
    const totalEnrollments = parseInt(enrollmentsResult.rows[0].count);
    const completedEnrollments = parseInt(completedResult.rows[0].count);
    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

    // Total study hours (estimate based on completed lessons)
    const studyHoursResult = await pool.query(`
      SELECT COALESCE(SUM(l.duration_min), 0) / 60 as total_hours
      FROM lesson_progress lp
      JOIN lessons l ON l.id = lp.lesson_id
      WHERE lp.status = 'COMPLETED'
    `);

    res.json({
      stats: {
        totalLearners: parseInt(learnersResult.rows[0].count),
        totalCourses: parseInt(coursesResult.rows[0].count),
        totalLessons: parseInt(lessonsResult.rows[0].count),
        totalEnrollments: totalEnrollments,
        completionRate: completionRate,
        totalStudyHours: Math.round(parseFloat(studyHoursResult.rows[0].total_hours) || 0)
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get admin stats.' });
  }
};

// Get ministry engagement stats
export const getMinistryStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.ministry,
        COUNT(DISTINCT u.id) as total_learners,
        COUNT(DISTINCT CASE WHEN u.last_login > NOW() - INTERVAL '30 days' THEN u.id END) as active_learners,
        COUNT(DISTINCT CASE WHEN e.completed_at IS NOT NULL THEN e.id END) as courses_completed
      FROM users u
      LEFT JOIN enrollments e ON e.user_id = u.id
      WHERE u.ministry IS NOT NULL AND u.role IN ('LEARNER', 'SUPERUSER')
      GROUP BY u.ministry
      ORDER BY total_learners DESC
    `);

    res.json({
      ministryStats: result.rows.map(row => ({
        name: row.ministry,
        totalLearners: parseInt(row.total_learners),
        activeLearners: parseInt(row.active_learners),
        coursesCompleted: parseInt(row.courses_completed),
        value: parseInt(row.total_learners) // For chart compatibility
      }))
    });
  } catch (error) {
    console.error('Get ministry stats error:', error);
    res.status(500).json({ error: 'Failed to get ministry stats.' });
  }
};

// Get content type distribution
export const getContentStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        type,
        COUNT(*) as count
      FROM lessons
      GROUP BY type
    `);

    const total = result.rows.reduce((acc, row) => acc + parseInt(row.count), 0);

    res.json({
      contentStats: result.rows.map(row => ({
        name: row.type.charAt(0).toUpperCase() + row.type.slice(1),
        value: Math.round((parseInt(row.count) / total) * 100),
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    console.error('Get content stats error:', error);
    res.status(500).json({ error: 'Failed to get content stats.' });
  }
};

// Get all users (Admin only)
export const getUsers = async (req, res) => {
  try {
    // Validate and sanitize pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { search, role, ministry } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (role) {
      whereClause += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    if (ministry) {
      whereClause += ` AND ministry = $${paramCount}`;
      params.push(ministry);
      paramCount++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    params.push(limit, offset);

    const usersResult = await pool.query(`
      SELECT id, email, name, role, ministry, created_at, last_login, is_active, is_approved
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, params);

    res.json({
      users: usersResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users.' });
  }
};

// Update user role (Admin only)
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, isActive } = req.body;

    const result = await pool.query(`
      UPDATE users
      SET role = COALESCE($1, role),
          is_active = COALESCE($2, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, name, role, ministry, is_active
    `, [role, isActive, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
};

// Get recent activity
export const getRecentActivity = async (req, res) => {
  try {
    // Validate and sanitize limit parameter
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const result = await pool.query(`
      SELECT
        lp.id,
        u.name as user_name,
        u.ministry,
        l.title as lesson_title,
        c.title as course_title,
        lp.status,
        lp.last_accessed
      FROM lesson_progress lp
      JOIN users u ON u.id = lp.user_id
      JOIN lessons l ON l.id = lp.lesson_id
      JOIN courses c ON c.id = lp.course_id
      ORDER BY lp.last_accessed DESC
      LIMIT $1
    `, [limit]);

    res.json({ activity: result.rows });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ error: 'Failed to get recent activity.' });
  }
};

// Get all courses with stats (Admin view)
export const getCoursesWithStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.*,
        COUNT(DISTINCT e.user_id) as enrolled_count,
        COUNT(DISTINCT CASE WHEN e.completed_at IS NOT NULL THEN e.id END) as completed_count,
        COUNT(DISTINCT l.id) as lesson_count,
        u.name as created_by_name
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN lessons l ON l.course_id = c.id
      LEFT JOIN users u ON u.id = c.created_by
      GROUP BY c.id, u.name
      ORDER BY c.order_index ASC, c.created_at DESC
    `);

    res.json({
      courses: result.rows.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnail: c.thumbnail_url,
        level: c.level,
        totalDuration: c.total_duration,
        isPublished: c.is_published,
        enrolledCount: parseInt(c.enrolled_count),
        completedCount: parseInt(c.completed_count),
        lessonCount: parseInt(c.lesson_count),
        createdBy: c.created_by_name,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    console.error('Get courses with stats error:', error);
    res.status(500).json({ error: 'Failed to get courses.' });
  }
};
