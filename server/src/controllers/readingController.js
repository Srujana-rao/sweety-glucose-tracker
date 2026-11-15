
const pool = require('../config/db')

// Allowed reading slots
const allowedSlots = [
  'Morning fasting',
  'After breakfast',
  'After lunch',
  'After dinner'
]

// ==========================================
// ADD GLUCOSE READING
// ==========================================

const addReading = async (req, res) => {
  try {
    const { reading_date, slot, glucose_level } = req.body

    // 1. Validate required fields
    if (
      !reading_date ||
      !slot ||
      glucose_level === undefined ||
      glucose_level === null
    ) {
      return res.status(400).json({
        message: 'Date, slot and glucose value are required'
      })
    }

    // 2. Validate date format
    if (
      typeof reading_date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(reading_date)
    ) {
      return res.status(400).json({
        message: 'Date must be in YYYY-MM-DD format'
      })
    }

    const [year, month, day] = reading_date.split('-').map(Number)
    const parsedDate = new Date(Date.UTC(year, month - 1, day))

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      return res.status(400).json({
        message: 'Please enter a valid date'
      })
    }

    // 3. Prevent future dates
    const dateCheck = await pool.query(
      'SELECT $1::date <= CURRENT_DATE AS is_valid',
      [reading_date]
    )

    if (!dateCheck.rows[0].is_valid) {
      return res.status(400).json({
        message: 'Future dates are not allowed'
      })
    }

    // 4. Validate slot
    if (!allowedSlots.includes(slot)) {
      return res.status(400).json({
        message: 'Invalid reading slot'
      })
    }

    // 5. Validate glucose value
    if (
      !Number.isInteger(glucose_level) ||
      glucose_level < 40 ||
      glucose_level > 600
    ) {
      return res.status(400).json({
        message: 'Glucose value must be an integer between 40 and 600'
      })
    }

    // 6. Insert reading
    const result = await pool.query(
      `INSERT INTO readings
       (user_id, reading_date, slot, glucose_level)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, reading_date, slot, glucose_level]
    )

    return res.status(201).json({
      message: 'Glucose reading added successfully',
      reading: result.rows[0]
    })

  } catch (error) {
    console.error('Add reading error:', error.message)

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A reading already exists for this slot on this date'
      })
    }

    return res.status(500).json({
      message: 'Server error while adding reading'
    })
  }
}


// ==========================================
// GET ALL GLUCOSE READINGS
// ==========================================

const getReadings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM readings
       WHERE user_id = $1
       ORDER BY reading_date DESC, created_at DESC`,
      [req.user.id]
    )

    return res.status(200).json({
      message: 'Readings retrieved successfully',
      readings: result.rows
    })

  } catch (error) {
    console.error('Get readings error:', error.message)

    return res.status(500).json({
      message: 'Server error while retrieving readings'
    })
  }
}


// ==========================================
// UPDATE GLUCOSE READING
// ==========================================

const updateReading = async (req, res) => {
  try {
    const { id } = req.params
    const { reading_date, slot, glucose_level } = req.body

    // 1. Validate ID
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: 'Invalid reading ID'
      })
    }

    // 2. Validate required fields
    if (
      !reading_date ||
      !slot ||
      glucose_level === undefined ||
      glucose_level === null
    ) {
      return res.status(400).json({
        message: 'Date, slot and glucose value are required'
      })
    }

    // 3. Validate date format
    if (
      typeof reading_date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(reading_date)
    ) {
      return res.status(400).json({
        message: 'Date must be in YYYY-MM-DD format'
      })
    }

    const [year, month, day] = reading_date.split('-').map(Number)
    const parsedDate = new Date(Date.UTC(year, month - 1, day))

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      return res.status(400).json({
        message: 'Please enter a valid date'
      })
    }

    // 4. Prevent future dates
    const dateCheck = await pool.query(
      'SELECT $1::date <= CURRENT_DATE AS is_valid',
      [reading_date]
    )

    if (!dateCheck.rows[0].is_valid) {
      return res.status(400).json({
        message: 'Future dates are not allowed'
      })
    }

    // 5. Validate slot
    if (!allowedSlots.includes(slot)) {
      return res.status(400).json({
        message: 'Invalid reading slot'
      })
    }

    // 6. Validate glucose value
    if (
      !Number.isInteger(glucose_level) ||
      glucose_level < 40 ||
      glucose_level > 600
    ) {
      return res.status(400).json({
        message: 'Glucose value must be an integer between 40 and 600'
      })
    }

    // 7. Update only if the reading belongs to logged-in user
    const result = await pool.query(
      `UPDATE readings
       SET reading_date = $1,
           slot = $2,
           glucose_level = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [reading_date, slot, glucose_level, id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Reading not found'
      })
    }

    return res.status(200).json({
      message: 'Glucose reading updated successfully',
      reading: result.rows[0]
    })

  } catch (error) {
    console.error('Update reading error:', error.message)

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A reading already exists for this slot on this date'
      })
    }

    return res.status(500).json({
      message: 'Server error while updating reading'
    })
  }
}


// ==========================================
// DELETE GLUCOSE READING
// ==========================================

const deleteReading = async (req, res) => {
  try {
    const { id } = req.params

    // 1. Validate ID
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        message: 'Invalid reading ID'
      })
    }

    // 2. Delete only if reading belongs to logged-in user
    const result = await pool.query(
      `DELETE FROM readings
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Reading not found'
      })
    }

    return res.status(200).json({
      message: 'Glucose reading deleted successfully',
      reading: result.rows[0]
    })

  } catch (error) {
    console.error('Delete reading error:', error.message)

    return res.status(500).json({
      message: 'Server error while deleting reading'
    })
  }
}


// ==========================================
// EXPORT ALL FUNCTIONS
// ==========================================

module.exports = {
  addReading,
  getReadings,
  updateReading,
  deleteReading
}
