
const pool = require('../config/db')
const bcrypt = require('bcrypt')

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required'
      })
    }

    // 2. Check whether email already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'Email is already registered'
      })
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 4. Insert user into PostgreSQL
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword]
    )

    // 5. Send success response
    res.status(201).json({
      message: 'Account created successfully',
      user: result.rows[0]
    })

  } catch (error) {
    console.error('Registration error:', error.message)

    res.status(500).json({
      message: 'Server error during registration'
    })
  }
}

module.exports = { registerUser }
