import { useEffect, useState } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import './Dashboard.css'
import './ReadingHistory.css'

const pageSize = 20
const readingSlots = [
  'Morning fasting',
  'After breakfast',
  'After lunch',
  'After dinner'
]

const getToday = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ReadingHistory() {
  const [readings, setReadings] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalRecords: 0
  })
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({
    reading_date: '',
    slot: '',
    glucose_level: ''
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    const fetchHistory = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await api.get('/readings', {
          params: { page, limit: pageSize }
        })
        if (!active) return

        const { readings: currentReadings, pagination: currentPagination } = response.data
        const lastPage = Math.max(currentPagination.totalPages, 1)

        if (page > lastPage) {
          setPage(lastPage)
          return
        }

        setReadings(currentReadings)
        setPagination(currentPagination)
      } catch (requestError) {
        if (!active) return
        setError(
          requestError.response?.data?.message ||
          'Unable to load reading history. Please try again.'
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchHistory()
    return () => {
      active = false
    }
  }, [page, refreshKey])

  const startEditing = (reading) => {
    setEditingId(reading.id)
    setEditValues({
      reading_date: String(reading.reading_date).slice(0, 10),
      slot: reading.slot,
      glucose_level: String(reading.glucose_level)
    })
    setError('')
    setSuccess('')
  }

  const updateEditValue = (event) => {
    const { name, value } = event.target
    setEditValues((current) => ({ ...current, [name]: value }))
  }

  const saveEdit = async (event, reading) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const glucoseLevel = Number(editValues.glucose_level)
    if (
      !editValues.reading_date ||
      editValues.reading_date > getToday() ||
      !readingSlots.includes(editValues.slot) ||
      !Number.isInteger(glucoseLevel) ||
      glucoseLevel < 40 ||
      glucoseLevel > 600
    ) {
      setError('Enter a valid past or current date, slot, and glucose value between 40 and 600.')
      return
    }

    setActionLoading(true)
    try {
      await api.put(`/readings/${reading.id}`, {
        reading_date: editValues.reading_date,
        slot: editValues.slot,
        glucose_level: glucoseLevel
      })
      setEditingId(null)
      setSuccess('Reading updated successfully.')
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to update this reading. Please try again.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const deleteReading = async (reading) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the ${reading.slot} reading for ${reading.reading_date}?`
    )
    if (!confirmed) return

    setError('')
    setSuccess('')
    setActionLoading(true)
    try {
      await api.delete(`/readings/${reading.id}`)
      setSuccess('Reading deleted successfully.')
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to delete this reading. Please try again.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Reading History</h1>
            <p>Review and manage your recorded glucose readings.</p>
          </div>
        </header>

        {error && <p className="form-error history-feedback">{error}</p>}
        {success && <p className="form-success history-feedback">{success}</p>}

        <section className="reading-form-section history-page-section">
          {loading ? (
            <p className="history-state">Loading reading history...</p>
          ) : readings.length === 0 ? (
            <p className="history-state">No readings recorded yet.</p>
          ) : (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th scope="col">Reading date</th>
                    <th scope="col">Slot</th>
                    <th scope="col">Glucose level</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.id}>
                      {editingId === reading.id ? (
                        <td colSpan="4">
                          <form
                            className="history-edit-form"
                            onSubmit={(event) => saveEdit(event, reading)}
                          >
                            <div className="form-field">
                              <label htmlFor={`history-date-${reading.id}`}>Reading date</label>
                              <input
                                id={`history-date-${reading.id}`}
                                name="reading_date"
                                type="date"
                                max={getToday()}
                                value={editValues.reading_date}
                                onChange={updateEditValue}
                                required
                              />
                            </div>
                            <div className="form-field">
                              <label htmlFor={`history-slot-${reading.id}`}>Slot</label>
                              <select
                                id={`history-slot-${reading.id}`}
                                name="slot"
                                value={editValues.slot}
                                onChange={updateEditValue}
                                required
                              >
                                {readingSlots.map((slot) => (
                                  <option key={slot} value={slot}>{slot}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-field">
                              <label htmlFor={`history-glucose-${reading.id}`}>Glucose (mg/dL)</label>
                              <input
                                id={`history-glucose-${reading.id}`}
                                name="glucose_level"
                                type="number"
                                min="40"
                                max="600"
                                step="1"
                                value={editValues.glucose_level}
                                onChange={updateEditValue}
                                required
                              />
                            </div>
                            <div className="history-row-actions">
                              <button type="submit" className="save-edit-button" disabled={actionLoading}>
                                {actionLoading ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="cancel-edit-button"
                                disabled={actionLoading}
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td data-label="Reading date">{String(reading.reading_date).slice(0, 10)}</td>
                          <td data-label="Slot">{reading.slot}</td>
                          <td data-label="Glucose level">{reading.glucose_level} mg/dL</td>
                          <td data-label="Actions">
                            <div className="history-row-actions">
                              <button
                                type="button"
                                className="edit-reading-button"
                                disabled={actionLoading}
                                onClick={() => startEditing(reading)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="delete-reading-button"
                                disabled={actionLoading}
                                onClick={() => deleteReading(reading)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="history-pagination">
            <span>
              Page {pagination.totalPages ? pagination.currentPage : 1}
              {' '}of {Math.max(pagination.totalPages, 1)}
              {' · '}{pagination.totalRecords} records
            </span>
            <div>
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={loading || page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default ReadingHistory
