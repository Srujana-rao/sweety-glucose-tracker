
const pool = require('../config/db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// ==========================================
// REGISTER USER
// ==========================================

const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required'
      })
    }

    // 2. Trim and normalize inputs
    name = name.trim()
    email = email.trim().toLowerCase()

    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email cannot be empty'
      })
    }

    // 3. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address'
      })
    }

    // 4. Validate password length
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and no more than 72 bytes'
      })
    }

    // 5. Check whether email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'Email is already registered'
      })
    }

    // 6. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 7. Insert user into PostgreSQL
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword]
    )

    // 8. Send success response
    return res.status(201).json({
      message: 'Account created successfully',
      user: result.rows[0]
    })

  } catch (error) {
    console.error('Registration error:', error.message)

    // Handle duplicate email constraint
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Email is already registered'
      })
    }

    return res.status(500).json({
      message: 'Server error during registration'
    })
  }
}


// ==========================================
// LOGIN USER
// ==========================================

const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body

    // 1. Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      })
    }

    // 2. Normalize email
    email = email.trim().toLowerCase()

    // 3. Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    const user = result.rows[0]

    // 4. Compare entered password with stored hash
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    )

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    // 5. Check JWT secret configuration
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured')
    }

    // 6. Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    )

    // 7. Send successful response
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Login error:', error.message)

    return res.status(500).json({
      message: 'Server error during login'
    })
  }
}


// ==========================================
// EXPORT FUNCTIONS
// ==========================================

module.exports = {
  registerUser,
  loginUser
}
