const pool = require('../config/db')

const slotOrder = `
  CASE slot
    WHEN 'Morning fasting' THEN 1
    WHEN 'After breakfast' THEN 2
    WHEN 'After lunch' THEN 3
    WHEN 'After dinner' THEN 4
    ELSE 5
  END
`

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

const pad = (value) => String(value).padStart(2, '0')

const formatDate = (year, month, day) => {
  return `${year}-${pad(month)}-${pad(day)}`
}

// Date boundaries are calculated from the YYYY-MM-DD string in UTC
// so month lengths and year rollover stay independent of local timezone.
const getReportRanges = (selectedDate) => {
  const [year, month, day] = selectedDate.split('-').map(Number)

  const previousMonthDate = new Date(Date.UTC(year, month - 2, 1))
  const previousYear = previousMonthDate.getUTCFullYear()
  const previousMonth = previousMonthDate.getUTCMonth() + 1
  const previousMonthLastDay = new Date(
    Date.UTC(year, month - 1, 0)
  ).getUTCDate()

  return {
    daily: {
      from: selectedDate,
      to: selectedDate
    },
    monthToDate: {
      from: formatDate(year, month, 1),
      to: selectedDate
    },
    previousMonth: {
      from: formatDate(previousYear, previousMonth, 1),
      to: formatDate(previousYear, previousMonth, previousMonthLastDay)
    }
  }
}

const toNumber = (value) => {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const buildSummary = (highest, lowest, average, count) => {
  const readingCount = Number(count) || 0

  if (readingCount === 0) {
    return {
      highest: null,
      lowest: null,
      average: null,
      count: 0
    }
  }

  const averageNumber = toNumber(average)

  return {
    highest: toNumber(highest),
    lowest: toNumber(lowest),
    average: averageNumber === null
      ? null
      : Number(averageNumber.toFixed(1)),
    count: readingCount
  }
}

const getReports = async (req, res) => {
  try {
    const { date } = req.query

    if (!date) {
      return res.status(400).json({
        message: 'Date is required in YYYY-MM-DD format'
      })
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        message: 'Please enter a valid date in YYYY-MM-DD format'
      })
    }

    if (await isFutureDate(date)) {
      return res.status(400).json({
        message: 'Future dates are not allowed'
      })
    }

    const ranges = getReportRanges(date)
    const userId = req.user.id

    const summaryQuery = pool.query(
      `SELECT
         MAX(glucose_level) FILTER (
           WHERE reading_date = $2::date
         ) AS daily_highest,
         MIN(glucose_level) FILTER (
           WHERE reading_date = $2::date
         ) AS daily_lowest,
         AVG(glucose_level) FILTER (
           WHERE reading_date = $2::date
         ) AS daily_average,
         COUNT(*) FILTER (
           WHERE reading_date = $2::date
         ) AS daily_count,

         MAX(glucose_level) FILTER (
           WHERE reading_date >= $3::date
             AND reading_date <= $2::date
         ) AS month_highest,
         MIN(glucose_level) FILTER (
           WHERE reading_date >= $3::date
             AND reading_date <= $2::date
         ) AS month_lowest,
         AVG(glucose_level) FILTER (
           WHERE reading_date >= $3::date
             AND reading_date <= $2::date
         ) AS month_average,
         COUNT(*) FILTER (
           WHERE reading_date >= $3::date
             AND reading_date <= $2::date
         ) AS month_count,

         MAX(glucose_level) FILTER (
           WHERE reading_date >= $4::date
             AND reading_date <= $5::date
         ) AS previous_highest,
         MIN(glucose_level) FILTER (
           WHERE reading_date >= $4::date
             AND reading_date <= $5::date
         ) AS previous_lowest,
         AVG(glucose_level) FILTER (
           WHERE reading_date >= $4::date
             AND reading_date <= $5::date
         ) AS previous_average,
         COUNT(*) FILTER (
           WHERE reading_date >= $4::date
             AND reading_date <= $5::date
         ) AS previous_count
       FROM readings
       WHERE user_id = $1
         AND reading_date >= $4::date
         AND reading_date <= $2::date`,
      [
        userId,
        ranges.daily.from,
        ranges.monthToDate.from,
        ranges.previousMonth.from,
        ranges.previousMonth.to
      ]
    )

    const dailyReadingsQuery = pool.query(
      `SELECT
         id,
         reading_date::text AS reading_date,
         slot,
         glucose_level
       FROM readings
       WHERE user_id = $1
         AND reading_date = $2::date
       ORDER BY ${slotOrder}`,
      [userId, ranges.daily.from]
    )

    const [summaryResult, dailyResult] = await Promise.all([
      summaryQuery,
      dailyReadingsQuery
    ])

    const summary = summaryResult.rows[0] || {}
    const daily = buildSummary(
      summary.daily_highest,
      summary.daily_lowest,
      summary.daily_average,
      summary.daily_count
    )
    const monthToDate = buildSummary(
      summary.month_highest,
      summary.month_lowest,
      summary.month_average,
      summary.month_count
    )
    const previousMonth = buildSummary(
      summary.previous_highest,
      summary.previous_lowest,
      summary.previous_average,
      summary.previous_count
    )

    return res.status(200).json({
      message: 'Reports retrieved successfully',
      selectedDate: date,
      daily: {
        dateRange: ranges.daily,
        ...daily,
        readings: dailyResult.rows.map((reading) => ({
          id: reading.id,
          reading_date: reading.reading_date,
          slot: reading.slot,
          glucose_level: Number(reading.glucose_level)
        }))
      },
      monthToDate: {
        dateRange: ranges.monthToDate,
        ...monthToDate
      },
      previousMonth: {
        dateRange: ranges.previousMonth,
        ...previousMonth
      }
    })

  } catch (error) {
    console.error('Get reports error:', error.message)

    return res.status(500).json({
      message: 'Server error while retrieving reports'
    })
  }
}

const getMonthlyTrends = async (req, res) => {
  try {
    const { month } = req.query

    if (
      typeof month !== 'string' ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
      Number(month.slice(0, 4)) < 1
    ) {
      return res.status(400).json({
        message: 'Please enter a valid month in YYYY-MM format'
      })
    }

    const [year, monthNumber] = month.split('-').map(Number)
    const daysInMonth = [
      31,
      year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31
    ]
    const lastDay = daysInMonth[monthNumber - 1]
    const from = `${month}-01`
    const to = `${month}-${String(lastDay).padStart(2, '0')}`

    const result = await pool.query(
      `SELECT
         reading_date::text AS reading_date,
         AVG(glucose_level) AS average,
         COUNT(*) AS count
       FROM readings
       WHERE user_id = $1
         AND reading_date >= $2::date
         AND reading_date <= LEAST($3::date, CURRENT_DATE)
       GROUP BY reading_date
       ORDER BY reading_date`,
      [req.user.id, from, to]
    )

    return res.status(200).json({
      message: 'Monthly trends retrieved successfully',
      month,
      dateRange: { from, to },
      dailyAverages: result.rows.map((reading) => ({
        reading_date: reading.reading_date,
        average: Number(reading.average),
        count: Number(reading.count)
      }))
    })
  } catch (error) {
    console.error('Get monthly trends error:', error.message)
    return res.status(500).json({
      message: 'Server error while retrieving monthly trends'
    })
  }
}

module.exports = {
  getReports,
  getReportRanges,
  getMonthlyTrends
}
