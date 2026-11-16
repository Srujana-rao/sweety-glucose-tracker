const express = require('express')
const router = express.Router()

const protect = require('../middleware/authMiddleware')
const {
  getReports,
  getMonthlyTrends
} = require('../controllers/reportController')

router.get('/trends', protect, getMonthlyTrends)
router.get('/', protect, getReports)

module.exports = router
