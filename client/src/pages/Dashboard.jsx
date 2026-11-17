
import React, { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
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
  const user = JSON.parse(
    sessionStorage.getItem('user') || '{}'
  )

  // ==========================================
  // STATE
  // ==========================================

  const [selectedDate, setSelectedDate] = useState(getToday())

  const [readings, setReadings] = useState([])
  const [slot, setSlot] = useState('')
  const [glucoseLevel, setGlucoseLevel] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Edit states
  const [editingReadingId, setEditingReadingId] = useState(null)
  const [editGlucoseLevel, setEditGlucoseLevel] = useState('')

  // ==========================================
  // TEMPORARY SUCCESS MESSAGE
  // ==========================================

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

  const lastObservedDate = useRef(getToday())

  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = getToday()

      if (lastObservedDate.current !== currentDate) {
        lastObservedDate.current = currentDate

        setSelectedDate(currentDate)
        setGlucoseLevel('')
        setError('')
        setSuccess('')
        setEditingReadingId(null)
        setEditGlucoseLevel('')

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

  const getReadingForSlot = (readingSlot) => {
    return dailyReadings.find(
      reading => reading.slot === readingSlot
    )
  }

  const availableSlots = allowedSlots.filter(
    readingSlot => !getReadingForSlot(readingSlot)
  )

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
  // START EDITING
  // ==========================================

  const handleEditClick = (reading) => {
    setEditingReadingId(reading.id)
    setEditGlucoseLevel(String(reading.glucose_level))
    setError('')
    setSuccess('')
  }

  // ==========================================
  // CANCEL EDITING
  // ==========================================

  const handleCancelEdit = () => {
    setEditingReadingId(null)
    setEditGlucoseLevel('')
    setError('')
  }

  // ==========================================
  // UPDATE GLUCOSE READING
  // ==========================================

  const handleUpdateReading = async (reading) => {
    setError('')
    setSuccess('')

    const glucose = Number(editGlucoseLevel)

    if (
      editGlucoseLevel === '' ||
      !Number.isInteger(glucose)
    ) {
      setError('Please enter a valid whole-number glucose reading.')
      return
    }

    if (glucose < 40 || glucose > 600) {
      setError('Glucose level must be between 40 and 600 mg/dL.')
      return
    }

    try {
      setActionLoading(true)

      await api.put(`/readings/${reading.id}`, {
        reading_date: selectedDate,
        slot: reading.slot,
        glucose_level: glucose
      })

      const updatedReadings = await fetchReadings()

      setEditingReadingId(null)
      setEditGlucoseLevel('')

      if (updatedReadings === null) {
        setSuccess(
          'Reading updated, but the list could not be refreshed.'
        )
      } else {
        setSuccess(
          `${reading.slot} reading updated successfully.`
        )
      }

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to update reading. Please try again.'
      )

    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // DELETE GLUCOSE READING
  // ==========================================

  const handleDeleteReading = async (reading) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the ${reading.slot} reading for ${selectedDate}?`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      setActionLoading(true)

      await api.delete(`/readings/${reading.id}`)

      const updatedReadings = await fetchReadings()

      if (updatedReadings === null) {
        setSuccess(
          'Reading deleted, but the list could not be refreshed.'
        )
      } else {
        setSuccess(
          `${reading.slot} reading deleted successfully.`
        )
      }

      if (editingReadingId === reading.id) {
        setEditingReadingId(null)
        setEditGlucoseLevel('')
      }

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to delete reading. Please try again.'
      )

    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // DISPLAY
  // ==========================================

  return (
    <div className="dashboard-page">

      <Sidebar />

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

            <span>Welcome back, {user.name || 'there'}</span>

          </div>

        </header>

        <div className="reading-panels">

        {/* 1. SELECT READING DATE */}
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
                setEditingReadingId(null)
                setEditGlucoseLevel('')
              }}
            />

          </div>

        </section>

        {/* 2. ADD GLUCOSE READING */}
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
                disabled={saving || loading || actionLoading}
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

        </div>

        {/* 3. DAILY READING STATUS */}
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

                    <div className="daily-slot-details">

                      <h3>{item}</h3>

                      {reading && editingReadingId === reading.id ? (

                        <div className="edit-reading-field">

                          <label htmlFor={`edit-${reading.id}`}>
                            Glucose Level (mg/dL)
                          </label>

                          <input
                            id={`edit-${reading.id}`}
                            type="number"
                            min="40"
                            max="600"
                            step="1"
                            value={editGlucoseLevel}
                            onChange={(e) => {
                              setEditGlucoseLevel(e.target.value)
                              setError('')
                            }}
                          />

                          <div className="reading-actions">

                            <button
                              type="button"
                              className="save-edit-button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateReading(reading)}
                            >
                              {actionLoading ? 'Saving...' : 'Save'}
                            </button>

                            <button
                              type="button"
                              className="cancel-edit-button"
                              disabled={actionLoading}
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </button>

                          </div>

                        </div>

                      ) : (

                        reading && (
                          <p>
                            {reading.glucose_level} mg/dL
                          </p>
                        )

                      )}

                    </div>

                    <div className="daily-slot-right">

                      <span
                        className={
                          reading
                            ? 'slot-recorded'
                            : 'slot-pending'
                        }
                      >
                        {reading ? 'Recorded' : 'Pending'}
                      </span>

                      {reading && editingReadingId !== reading.id && (

                        <div className="reading-actions">

                          <button
                            type="button"
                            className="edit-reading-button"
                            disabled={actionLoading}
                            onClick={() => handleEditClick(reading)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-reading-button"
                            disabled={actionLoading}
                            onClick={() => handleDeleteReading(reading)}
                          >
                            Delete
                          </button>

                        </div>

                      )}

                    </div>

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
