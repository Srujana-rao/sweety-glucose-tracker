import { useEffect, useState } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import './Dashboard.css'
import './ReadingHistory.css'

const pageSize = 20

const formatEntryTime = (value) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

function ReadingHistory() {
  const [readings, setReadings] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalRecords: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  }, [page])

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Reading History</h1>
            <p>Review your recorded glucose readings.</p>
          </div>
        </header>

        {error && <p className="form-error history-feedback">{error}</p>}

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
                    <th scope="col">Entered At</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.id}>
                      <td data-label="Reading date">{String(reading.reading_date).slice(0, 10)}</td>
                      <td data-label="Slot">{reading.slot}</td>
                      <td data-label="Glucose level">{reading.glucose_level} mg/dL</td>
                      <td data-label="Entered At">{formatEntryTime(reading.created_at)}</td>
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
