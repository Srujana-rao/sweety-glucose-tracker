
const express = require('express')
const router = express.Router()

const protect = require('../middleware/authMiddleware')

const {
  addReading,
  getReadings,
  updateReading,
  deleteReading
} = require('../controllers/readingController')

// CREATE - Add a reading
router.post('/', protect, addReading)

// READ - Get all readings
router.get('/', protect, getReadings)

// UPDATE - Edit a reading by ID
router.put('/:id', protect, updateReading)

// DELETE - Delete a reading by ID
router.delete('/:id', protect, deleteReading)

module.exports = router
