import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { validationResult } from 'express-validator';

// Generate JWT token with proper claims
const generateToken = (userId, email) => {
  return jwt.sign(
    {
      sub: userId,
      email: email,
      iss: 'amini-academy-api',
      aud: 'amini-academy-app'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      algorithm: 'HS256'
    }
  );
};

// ===========================================
// REGISTRATION - Creates pending user
// ===========================================
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, ministry, role = 'LEARNER' } = req.body;

    // Prevent self-registration as ADMIN
    if (role === 'ADMIN') {
      return res.status(403).json({ error: 'Cannot register as admin.' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id, is_approved FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (!user.is_approved) {
        return res.status(400).json({
          error: 'Registration already submitted. Please wait for admin approval.',
          status: 'PENDING_APPROVAL'
        });
      }
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with is_approved = false
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, ministry, role, is_approved)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, email, name, role, ministry, created_at, is_approved`,
      [email.toLowerCase(), passwordHash, name, ministry, role]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'Registration submitted successfully. Please wait for admin approval.',
      status: 'PENDING_APPROVAL',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ministry: user.ministry,
        isApproved: false
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// ===========================================
// LOGIN - Only approved users can login
// ===========================================
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated. Contact administrator.' });
    }

    // Check if account is approved
    if (!user.is_approved) {
      return res.status(403).json({
        error: 'Your account is pending admin approval. Please wait.',
        status: 'PENDING_APPROVAL'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ministry: user.ministry,
        avatarUrl: user.avatar_url,
        isApproved: user.is_approved
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// ===========================================
// GET CURRENT USER
// ===========================================
export const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, ministry, avatar_url, created_at, last_login, is_approved
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    // Get enrolled courses count
    const enrollments = await pool.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1',
      [user.id]
    );

    // Get completed courses count
    const completed = await pool.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1 AND completed_at IS NOT NULL',
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ministry: user.ministry,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        isApproved: user.is_approved,
        enrolledCoursesCount: parseInt(enrollments.rows[0].count),
        completedCoursesCount: parseInt(completed.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data.' });
  }
};

// ===========================================
// UPDATE PROFILE
// ===========================================
export const updateProfile = async (req, res) => {
  try {
    const { name, ministry } = req.body;

    // Validate input lengths
    if (name && name.length > 255) {
      return res.status(400).json({ error: 'Name too long.' });
    }
    if (ministry && ministry.length > 255) {
      return res.status(400).json({ error: 'Ministry too long.' });
    }

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           ministry = COALESCE($2, ministry),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, name, role, ministry, avatar_url`,
      [name, ministry, req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

// ===========================================
// CHANGE PASSWORD
// ===========================================
export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(12);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
};

// ===========================================
// ADMIN: GET PENDING USERS
// ===========================================
export const getPendingUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, name, role, ministry, created_at
      FROM users
      WHERE is_approved = false AND is_active = true
      ORDER BY created_at ASC
    `);

    res.json({
      pendingUsers: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Failed to fetch pending users.' });
  }
};

// ===========================================
// ADMIN: APPROVE USER
// ===========================================
export const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists and is pending
    const userCheck = await pool.query(
      'SELECT id, email, name, is_approved FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (userCheck.rows[0].is_approved) {
      return res.status(400).json({ error: 'User is already approved.' });
    }

    // Approve user
    const result = await pool.query(`
      UPDATE users
      SET is_approved = true,
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, name, role, ministry, is_approved, approved_at
    `, [req.user.id, userId]);

    res.json({
      message: 'User approved successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user.' });
  }
};

// ===========================================
// ADMIN: REJECT USER
// ===========================================
export const rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, email, is_approved FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (userCheck.rows[0].is_approved) {
      return res.status(400).json({ error: 'Cannot reject an already approved user. Use deactivate instead.' });
    }

    // Reject user - set is_active = false and store rejection reason
    await pool.query(`
      UPDATE users
      SET is_active = false,
          rejection_reason = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [reason || 'Registration rejected by administrator', userId]);

    res.json({
      message: 'User registration rejected',
      userId: userId
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Failed to reject user.' });
  }
};
