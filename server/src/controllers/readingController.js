
const pool = require('../config/db')

// Allowed reading slots
const allowedSlots = [
  'Morning fasting',
  'After breakfast',
  'After lunch',
  'After dinner'
]

// ==========================================
// REUSABLE VALIDATION FUNCTIONS
// ==========================================

const isValidDate = (date) => {
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return false
  }

  const [year, month, day] = date.split('-').map(Number)
  const parsedDate = new Date(Date.UTC(year, month - 1, day))

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  )
}

const isFutureDate = async (date) => {
  const result = await pool.query(
    'SELECT $1::date > CURRENT_DATE AS is_future',
    [date]
  )

  return result.rows[0].is_future
}

const isValidGlucose = (value) => {
  return (
    Number.isInteger(value) &&
    value >= 40 &&
    value <= 600
  )
}

// Return dates as YYYY-MM-DD to avoid timezone conversion
const readingColumns = `
  id,
  user_id,
  reading_date::text AS reading_date,
  slot,
  glucose_level,
  created_at
`

// ==========================================
// ADD GLUCOSE READING
// ==========================================

const addReading = async (req, res) => {
  try {
    const { reading_date, slot, glucose_level } = req.body

    // 1. Required fields
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

    // 2. Validate date
    if (!isValidDate(reading_date)) {
      return res.status(400).json({
        message: 'Please enter a valid date in YYYY-MM-DD format'
      })
    }

    // 3. Prevent future dates
    if (await isFutureDate(reading_date)) {
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
    if (!isValidGlucose(glucose_level)) {
      return res.status(400).json({
        message: 'Glucose value must be an integer between 40 and 600'
      })
    }

    // 6. Insert reading for authenticated user
    const result = await pool.query(
      `INSERT INTO readings
       (user_id, reading_date, slot, glucose_level)
       VALUES ($1, $2, $3, $4)
       RETURNING ${readingColumns}`,
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
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined

    if (hasPagination) {
      const pageValue = req.query.page === undefined ? '1' : req.query.page
      const limitValue = req.query.limit === undefined ? '20' : req.query.limit
      const isPositiveInteger = (value) =>
        typeof value === 'string' &&
        /^[1-9]\d*$/.test(value) &&
        Number.isSafeInteger(Number(value))

      if (!isPositiveInteger(pageValue) || !isPositiveInteger(limitValue)) {
        return res.status(400).json({
          message: 'Page and limit must be positive integers'
        })
      }

      const page = Number(pageValue)
      const limit = Number(limitValue)

      if (limit > 100) {
        return res.status(400).json({
          message: 'Limit cannot exceed 100'
        })
      }

      const offset = (page - 1) * limit
      if (!Number.isSafeInteger(offset)) {
        return res.status(400).json({
          message: 'Page is too large'
        })
      }

      const [countResult, readingsResult] = await Promise.all([
        pool.query(
          'SELECT COUNT(*) FROM readings WHERE user_id = $1',
          [req.user.id]
        ),
        pool.query(
          `SELECT ${readingColumns}
           FROM readings
           WHERE user_id = $1
           ORDER BY reading_date DESC, created_at DESC, id DESC
           LIMIT $2 OFFSET $3`,
          [req.user.id, limit, offset]
        )
      ])

      const totalRecords = Number(countResult.rows[0].count)

      return res.status(200).json({
        message: 'Readings retrieved successfully',
        readings: readingsResult.rows,
        pagination: {
          currentPage: page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit)
        }
      })
    }

    const result = await pool.query(
      `SELECT ${readingColumns}
       FROM readings
       WHERE user_id = $1
       ORDER BY reading_date DESC, created_at DESC, id DESC`,
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

    // 2. Required fields
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

    // 3. Validate date
    if (!isValidDate(reading_date)) {
      return res.status(400).json({
        message: 'Please enter a valid date in YYYY-MM-DD format'
      })
    }

    // 4. Prevent future dates
    if (await isFutureDate(reading_date)) {
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

    // 6. Validate glucose
    if (!isValidGlucose(glucose_level)) {
      return res.status(400).json({
        message: 'Glucose value must be an integer between 40 and 600'
      })
    }

    // 7. Update only the logged-in user's reading
    const result = await pool.query(
      `UPDATE readings
       SET reading_date = $1,
           slot = $2,
           glucose_level = $3
       WHERE id = $4 AND user_id = $5
       RETURNING ${readingColumns}`,
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

    // 2. Delete only the logged-in user's reading
    const result = await pool.query(
      `DELETE FROM readings
       WHERE id = $1 AND user_id = $2
       RETURNING ${readingColumns}`,
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
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  addReading,
  getReadings,
  updateReading,
  deleteReading
}
