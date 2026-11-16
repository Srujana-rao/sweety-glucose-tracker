import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import './Dashboard.css'
import './Reports.css'

const VisualAnalytics = lazy(() => import('./VisualAnalytics'))

const getToday = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const formatDisplayDate = (value) => {
  if (!value) return ''
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return value
  return `${day} ${monthNames[month - 1]} ${year}`
}

const formatRange = (range) => {
  if (!range) return ''
  if (range.from === range.to) return formatDisplayDate(range.from)
  return `${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)}`
}

const formatStat = (value, digits = 0) => {
  if (value === null || value === undefined || value === '') return '--'
  return digits ? Number(value).toFixed(digits) : String(value)
}

function StatCard({ label, value, unit = 'mg/dL' }) {
  const empty = value === '--'

  return (
    <div className="summary-card">
      <p>{label}</p>
      <h2>{value}</h2>
      <span>{empty ? 'No data' : unit}</span>
    </div>
  )
}

function ReportStats({ summary, wide = false }) {
  return (
    <div className={`summary-section report-stats${wide ? ' wide' : ''}`}>
      <StatCard label="Highest" value={formatStat(summary?.highest)} />
      <StatCard label="Lowest" value={formatStat(summary?.lowest)} />
      <StatCard label="Average" value={formatStat(summary?.average, 1)} />
      <StatCard
        label="Readings"
        value={String(summary?.count ?? 0)}
        unit="Total recorded"
      />
    </div>
  )
}

function Reports() {
  const requestId = useRef(0)

  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [selectedDate, setSelectedDate] = useState(getToday())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const currentRequest = ++requestId.current

    const fetchReport = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await api.get('/reports', {
          params: { date: selectedDate }
        })

        if (currentRequest !== requestId.current) return

        setReport(response.data)
      } catch (err) {
        if (currentRequest !== requestId.current) return

        setReport(null)
        setError(
          err.response?.data?.message ||
          'Unable to load reports. Please try again.'
        )
      } finally {
        if (currentRequest === requestId.current) {
          setLoading(false)
        }
      }
    }

    fetchReport()
  }, [selectedDate])

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Reports</h1>
            <p>Daily, month-to-date, and previous month summaries</p>
          </div>

          <div className="user-info">
            <div className="user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span>Welcome back, {user.name || 'there'}</span>
          </div>
        </header>

        <section className="reading-form-section">
          <div className="section-heading">
            <div>
              <h2>Select Report Date</h2>
              <p>All three reports update from this date.</p>
            </div>
          </div>

          <div className="form-field date-status-field">
            <label htmlFor="report-date">Report Date</label>
            <input
              id="report-date"
              type="date"
              value={selectedDate}
              max={getToday()}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </section>

        {loading && <p className="report-status">Loading reports...</p>}

        {error && <p className="form-error report-status">{error}</p>}

        {!loading && !error && report && (
          <>
            <section className="reading-form-section">
              <div className="section-heading">
                <div>
                  <h2>Daily Report</h2>
                  <p>{formatRange(report.daily.dateRange)}</p>
                </div>
              </div>

              <ReportStats summary={report.daily} wide />

              {report.daily.count === 0 ? (
                <p className="report-empty">
                  No readings recorded for this date.
                </p>
              ) : (
                <div className="daily-slots-list">
                  {report.daily.readings.map((reading) => (
                    <div className="daily-slot" key={reading.id}>
                      <div className="daily-slot-details">
                        <h3>{reading.slot}</h3>
                        <p>{reading.glucose_level} mg/dL</p>
                      </div>
                      <span className="slot-recorded">Recorded</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="reading-panels">
              <section className="reading-form-section">
                <div className="section-heading">
                  <div>
                    <h2>Month-to-Date Report</h2>
                    <p>{formatRange(report.monthToDate.dateRange)}</p>
                  </div>
                </div>

                <ReportStats summary={report.monthToDate} />

                {report.monthToDate.count === 0 && (
                  <p className="report-empty">
                    No readings recorded from the start of this month through the selected date.
                  </p>
                )}
              </section>

              <section className="reading-form-section">
                <div className="section-heading">
                  <div>
                    <h2>Previous Month Report</h2>
                    <p>{formatRange(report.previousMonth.dateRange)}</p>
                  </div>
                </div>

                <ReportStats summary={report.previousMonth} />

                {report.previousMonth.count === 0 && (
                  <p className="report-empty">
                    No readings recorded for the previous month.
                  </p>
                )}
              </section>
            </div>
          </>
        )}

        <Suspense fallback={<p className="report-status">Loading visual analytics...</p>}>
          <VisualAnalytics
            selectedDate={selectedDate}
            dailyReadings={report?.daily?.readings || []}
            dailyLoading={loading}
            dailyError={error}
          />
        </Suspense>
      </main>
    </div>
  )
}

export default Reports
