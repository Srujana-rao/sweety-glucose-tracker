const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')

const profileFields = 'id, name, email, created_at'

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${profileFields}
       FROM users
       WHERE id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' })
    }

    return res.status(200).json({
      message: 'Profile retrieved successfully',
      profile: result.rows[0]
    })
  } catch (error) {
    console.error('Get profile error:', error.message)
    return res.status(500).json({
      message: 'Server error while retrieving profile'
    })
  }
}

const updateProfile = async (req, res) => {
  try {
    const body = req.body || {}
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name || name.length > 100) {
      return res.status(400).json({
        message: 'Name must contain between 1 and 100 characters'
      })
    }

    const userResult = await pool.query(
      'SELECT email, password FROM users WHERE id = $1',
      [req.user.id]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' })
    }

    if (body.email !== undefined && typeof body.email !== 'string') {
      return res.status(400).json({
        message: 'Please enter a valid email address'
      })
    }

    const email = typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : userResult.rows[0].email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!email || email.length > 254 || !emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address'
      })
    }

    const emailChanged = email !== userResult.rows[0].email.toLowerCase()

    if (emailChanged) {
      if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
        return res.status(400).json({
          message: 'Current password is required to change your email'
        })
      }

      const currentPasswordValid = await bcrypt.compare(
        body.currentPassword,
        userResult.rows[0].password
      )

      if (!currentPasswordValid) {
        return res.status(401).json({
          message: 'Current password is incorrect'
        })
      }

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured')
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           email = $2
       WHERE id = $3
       RETURNING ${profileFields}`,
      [name, email, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' })
    }

    const token = emailChanged
      ? jwt.sign(
          { id: req.user.id, email },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        )
      : undefined

    return res.status(200).json({
      message: emailChanged
        ? 'Profile updated. The new email is not verified.'
        : 'Profile updated successfully',
      profile: result.rows[0],
      ...(token ? { token } : {})
    })
  } catch (error) {
    console.error('Update profile error:', error.message)

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Email is already registered'
      })
    }

    return res.status(500).json({
      message: 'Server error while updating profile'
    })
  }
}

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {}

    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      typeof confirmPassword !== 'string' ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: 'Current password, new password and confirmation are required'
      })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'New password and confirmation do not match'
      })
    }

    if (newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and no more than 72 bytes'
      })
    }

    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' })
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password
    )

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        message: 'Current password is incorrect'
      })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, req.user.id]
    )

    return res.status(200).json({
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Change password error:', error.message)
    return res.status(500).json({
      message: 'Server error while changing password'
    })
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword
}
