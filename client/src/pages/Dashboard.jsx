
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import './Dashboard.css'

const allowedSlots = [
  'Morning fasting',
  'After breakfast',
  'After lunch',
  'After dinner'
]

// Get today's date in local YYYY-MM-DD format
const getToday = () => {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// Normalize reading date
const normalizeReadingDate = (value) => {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function Dashboard() {
  const navigate = useNavigate()

  const user = JSON.parse(
    sessionStorage.getItem('user') || '{}'
  )

  // ==========================================
  // STATE
  // ==========================================

  // Automatically select today's date
  const [selectedDate, setSelectedDate] = useState(getToday())

  const [readings, setReadings] = useState([])
  const [slot, setSlot] = useState('')
  const [glucoseLevel, setGlucoseLevel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ==========================================
  // TEMPORARY SUCCESS MESSAGE
  // ==========================================

  // Clear individual success messages after 3.5 seconds
  useEffect(() => {
    if (!success) return

    const timer = setTimeout(() => {
      setSuccess('')
    }, 3500)

    return () => clearTimeout(timer)
  }, [success])

  // ==========================================
  // FETCH READINGS
  // ==========================================

  const fetchReadings = async () => {
    try {
      const response = await api.get('/readings')

      const data = response.data

      const readingList = Array.isArray(data)
        ? data
        : data.readings || []

      setReadings(readingList)

      return readingList

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to load readings. Please try again.'
      )

      return null

    } finally {
      setLoading(false)
    }
  }

  // Fetch saved readings whenever dashboard opens
  useEffect(() => {
    fetchReadings()
  }, [])

  // ==========================================
  // AUTOMATIC NEW-DAY DETECTION
  // ==========================================

  // Remember the last actual calendar date
  const lastObservedDate = useRef(getToday())

  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = getToday()

      // Reset only when the actual calendar day changes
      if (lastObservedDate.current !== currentDate) {
        lastObservedDate.current = currentDate

        setSelectedDate(currentDate)
        setGlucoseLevel('')
        setError('')
        setSuccess('')

        fetchReadings()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // ==========================================
  // FILTER READINGS FOR SELECTED DATE
  // ==========================================

  const dailyReadings = readings.filter(reading =>
    normalizeReadingDate(reading.reading_date) === selectedDate
  )

  // Find reading for a particular slot
  const getReadingForSlot = (readingSlot) => {
    return dailyReadings.find(
      reading => reading.slot === readingSlot
    )
  }

  // Slots that have not been recorded
  const availableSlots = allowedSlots.filter(
    readingSlot => !getReadingForSlot(readingSlot)
  )

  // Check whether all four readings are recorded
  const allReadingsRecorded = dailyReadings.length === 4

  // ==========================================
  // KEEP SLOT SELECTION VALID
  // ==========================================

  useEffect(() => {
    if (availableSlots.length === 0) {
      setSlot('')
      return
    }

    if (!availableSlots.includes(slot)) {
      setSlot(availableSlots[0])
    }
  }, [selectedDate, readings])

  // ==========================================
  // ADD GLUCOSE READING
  // ==========================================

  const handleAddReading = async (e) => {
    e.preventDefault()

    setError('')
    setSuccess('')

    if (!selectedDate) {
      setError('Please select a reading date.')
      return
    }

    const glucose = Number(glucoseLevel)

    if (
      glucoseLevel === '' ||
      !Number.isInteger(glucose)
    ) {
      setError('Please enter a valid whole-number glucose reading.')
      return
    }

    if (glucose < 40 || glucose > 600) {
      setError('Glucose level must be between 40 and 600 mg/dL.')
      return
    }

    if (selectedDate > getToday()) {
      setError('Future dates are not allowed.')
      return
    }

    if (!slot || !availableSlots.includes(slot)) {
      setError('Please select an available reading slot.')
      return
    }

    try {
      setSaving(true)

      const savedSlot = slot
      const savedDate = selectedDate

      await api.post('/readings', {
        reading_date: savedDate,
        slot: savedSlot,
        glucose_level: glucose
      })

      // Refresh readings after successful insertion
      const updatedReadings = await fetchReadings()

      if (updatedReadings === null) {
        setSuccess(
          `${savedSlot} reading was saved, but the list could not be refreshed.`
        )
      } else {
        setSuccess(
          `${savedSlot} reading added successfully for ${savedDate}.`
        )
      }

      setGlucoseLevel('')

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to add reading. Please try again.'
      )

    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')

    navigate('/login')
  }

  // ==========================================
  // SELECTED DATE SUMMARY CARDS
  // ==========================================

  // Get readings only for the selected date
  const selectedDateReadings = readings.filter(reading =>
    normalizeReadingDate(reading.reading_date) === selectedDate
  )

  // Extract glucose values for the selected date
  const selectedDateValues = selectedDateReadings.map(
    reading => Number(reading.glucose_level)
  )

  // Calculate average only when readings exist
  const average = selectedDateValues.length
    ? (
        selectedDateValues.reduce((sum, value) => sum + value, 0) /
        selectedDateValues.length
      ).toFixed(1)
    : '--'

  // Highest reading
  const highest = selectedDateValues.length
    ? Math.max(...selectedDateValues)
    : '--'

  // Lowest reading
  const lowest = selectedDateValues.length
    ? Math.min(...selectedDateValues)
    : '--'

  // ==========================================
  // DISPLAY
  // ==========================================

  return (
    <div className="dashboard-page">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="sidebar-logo">
          <h2>Sweety</h2>
          <p>Blood Glucose Tracker</p>
        </div>

        <nav className="sidebar-nav">

          <Link to="/dashboard" className="nav-link active">
            <span>▦</span>
            Dashboard
          </Link>

          <Link to="/reports" className="nav-link">
            <span>▤</span>
            Reports
          </Link>

        </nav>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          ↪ Logout
        </button>

      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">

        {/* DASHBOARD HEADER */}
        <header className="dashboard-header">

          <div>
            <h1>Dashboard</h1>
            <p>Your blood glucose overview</p>
          </div>

          <div className="user-info">

            <div className="user-avatar">
              {user.name
                ? user.name.charAt(0).toUpperCase()
                : 'U'}
            </div>

            <span>{user.name || 'User'}</span>

          </div>

        </header>

        {/* WELCOME SECTION */}
        <section className="welcome-section">

          <h2>
            Good evening, {user.name || 'there'}! 👋
          </h2>

          <p>
            Keep track of your glucose levels and stay informed
            about your daily readings.
          </p>

        </section>

        {/* FOUR SUMMARY CARDS */}
        <section className="summary-section">

          <div className="summary-card">
            <p>Readings for Selected Date</p>
            <h2>{selectedDateReadings.length}/4</h2>
            <span>Readings recorded</span>
          </div>

          <div className="summary-card">
            <p>Average Glucose</p>
            <h2>{average}</h2>
            <span>mg/dL</span>
          </div>

          <div className="summary-card">
            <p>Highest Reading</p>
            <h2>{highest}</h2>
            <span>mg/dL</span>
          </div>

          <div className="summary-card">
            <p>Lowest Reading</p>
            <h2>{lowest}</h2>
            <span>mg/dL</span>
          </div>

        </section>

        {/* =====================================
            1. SELECT READING DATE
        ===================================== */}

        <section className="reading-form-section">

          <div className="section-heading">
            <div>
              <h2>Select Reading Date</h2>
              <p>
                Today is selected automatically. You can also view previous dates.
              </p>
            </div>
          </div>

          <div className="form-field date-status-field">

            <label htmlFor="reading-date">
              Reading Date
            </label>

            <input
              id="reading-date"
              type="date"
              value={selectedDate}
              max={getToday()}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setError('')
                setSuccess('')
                setGlucoseLevel('')
              }}
            />

          </div>

        </section>

        {/* =====================================
            2. ADD GLUCOSE READING
        ===================================== */}

        <section className="reading-form-section">

          <div className="section-heading">
            <div>
              <h2>Add Glucose Reading</h2>
              <p>
                Record a reading for {selectedDate}
              </p>
            </div>
          </div>

          {loading ? (

            <p>Loading readings...</p>

          ) : allReadingsRecorded ? (

            <p className="form-success">
              All four readings have been recorded for this date!
            </p>

          ) : (

            <form
              onSubmit={handleAddReading}
              className="reading-form"
            >

              <div className="form-field">

                <label htmlFor="reading-slot">
                  Reading Slot
                </label>

                <select
                  id="reading-slot"
                  value={slot}
                  onChange={(e) => {
                    setSlot(e.target.value)
                    setError('')
                    setSuccess('')
                  }}
                  required
                >

                  {availableSlots.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}

                </select>

              </div>

              <div className="form-field">

                <label htmlFor="glucose-level">
                  Glucose Level (mg/dL)
                </label>

                <input
                  id="glucose-level"
                  type="number"
                  min="40"
                  max="600"
                  step="1"
                  placeholder="Enter glucose level"
                  value={glucoseLevel}
                  onChange={(e) => {
                    setGlucoseLevel(e.target.value)
                    setError('')
                    setSuccess('')
                  }}
                  required
                />

              </div>

              <button
                type="submit"
                className="add-reading-button"
                disabled={saving || loading}
              >
                {saving ? 'Saving...' : 'Add Reading'}
              </button>

            </form>

          )}

          {error && (
            <p className="form-error">{error}</p>
          )}

          {success && (
            <p className="form-success">{success}</p>
          )}

        </section>

        {/* =====================================
            3. DAILY READING STATUS
        ===================================== */}

        <section className="daily-slots-section">

          <div className="section-heading">
            <div>
              <h2>Daily Reading Status</h2>
              <p>
                Four reading slots for {selectedDate}
              </p>
            </div>
          </div>

          {loading ? (

            <p>Loading readings...</p>

          ) : (

            <div className="daily-slots-list">

              {allowedSlots.map(item => {

                const reading = getReadingForSlot(item)

                return (
                  <div className="daily-slot" key={item}>

                    <div>
                      <h3>{item}</h3>

                      {reading && (
                        <p>
                          {reading.glucose_level} mg/dL
                        </p>
                      )}
                    </div>

                    <span
                      className={
                        reading
                          ? 'slot-recorded'
                          : 'slot-pending'
                      }
                    >
                      {reading ? 'Recorded' : 'Pending'}
                    </span>

                  </div>
                )
              })}

            </div>

          )}

        </section>

      </main>

    </div>
  )
}

export default Dashboard
