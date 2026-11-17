import { useEffect, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import api from '../services/api'

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

const formatDisplayDate = (value) => {
  if (!value) return ''
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return value
  return `${day} ${monthNames[month - 1]} ${year}`
}

const formatMonth = (value) => {
  const [year, month] = value.split('-').map(Number)
  return `${monthNames[month - 1]} ${year}`
}

const getDaysInMonth = (year, month) => {
  const days = [
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
  return days[month - 1]
}

const buildMonthlySeries = (month, dailyAverages) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  const today = getToday()
  const endDay = month === today.slice(0, 7)
    ? Number(today.slice(8, 10))
    : getDaysInMonth(year, monthNumber)
  const averageByDate = new Map(
    dailyAverages.map((item) => [item.reading_date, item])
  )

  return Array.from({ length: endDay }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    const date = `${monthStart.slice(0, 8)}${day}`
    const record = averageByDate.get(date)
    return {
      reading_date: date,
      average: record ? Number(record.average) : null,
      count: record ? Number(record.count) : 0
    }
  })
}

function TrendTooltip({ active, payload }) {
  const date = payload?.[0]?.payload
  if (!active || !date || date.average === null) return null

  return (
    <div className="chart-tooltip">
      <strong>{formatDisplayDate(date.reading_date)}</strong>
      <span>Daily average: {Number(date.average).toFixed(1)} mg/dL</span>
      <span>{date.count} readings</span>
    </div>
  )
}

function VisualAnalytics({
  selectedDate,
  dailyReadings,
  dailyLoading,
  dailyError
}) {
  const trendMonth = selectedDate.slice(0, 7)
  const [trendData, setTrendData] = useState(null)
  const [trendLoading, setTrendLoading] = useState(true)
  const [trendError, setTrendError] = useState('')
  const trendRequestId = useRef(0)

  useEffect(() => {
    const currentRequest = ++trendRequestId.current

    const fetchTrends = async () => {
      setTrendLoading(true)
      setTrendError('')

      try {
        const response = await api.get('/reports/trends', {
          params: { month: trendMonth }
        })

        if (currentRequest !== trendRequestId.current) return
        setTrendData(response.data)
      } catch (requestError) {
        if (currentRequest !== trendRequestId.current) return

        setTrendData(null)
        setTrendError(
          requestError.response?.data?.message ||
          'Unable to load visual analytics. Please try again.'
        )
      } finally {
        if (currentRequest === trendRequestId.current) {
          setTrendLoading(false)
        }
      }
    }

    fetchTrends()
  }, [trendMonth])

  const dailySlotData = readingSlots.map((slot) => {
    const reading = dailyReadings.find((item) => item.slot === slot)
    return {
      slot,
      glucose_level: reading ? Number(reading.glucose_level) : null
    }
  })
  const monthlySeries = buildMonthlySeries(
    trendMonth,
    trendData?.dailyAverages || []
  )

  return (
    <section className="reading-form-section analytics-section">
      <div className="section-heading">
        <div>
          <h2>Visual Analytics</h2>
          <p>Explore glucose readings and slot patterns.</p>
        </div>
      </div>

      {trendLoading && <p className="report-status">Loading visual analytics...</p>}
      {trendError && <p className="form-error report-status">{trendError}</p>}

      {!trendLoading && !trendError && trendData && (
        <>
          <div className="analytics-grid">
            <section className="analytics-chart-card">
              <div className="section-heading">
                <div>
                  <h2>Daily Slot Comparison</h2>
                  <p>{formatDisplayDate(selectedDate)}</p>
                </div>
              </div>

              {dailyLoading ? (
                <p className="report-empty">Loading selected-date readings...</p>
              ) : dailyError ? (
                <p className="report-empty">Daily chart is unavailable.</p>
              ) : dailySlotData.every((item) => item.glucose_level === null) ? (
                <p className="report-empty">No readings recorded for this date.</p>
              ) : (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailySlotData} margin={{ top: 16, right: 12, bottom: 48, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dce7f0" />
                      <XAxis
                        dataKey="slot"
                        interval={0}
                        angle={-22}
                        textAnchor="end"
                        height={64}
                        tick={{ fill: '#1a2b3c', fontSize: 11 }}
                      />
                      <YAxis
                        width={48}
                        tick={{ fill: '#1a2b3c', fontSize: 12 }}
                        label={{ value: 'mg/dL', angle: -90, position: 'insideLeft', fill: '#1a2b3c' }}
                      />
                      <Tooltip formatter={(value) => [`${value} mg/dL`, 'Glucose']} />
                      <Legend />
                      <Bar dataKey="glucose_level" name="Glucose" fill="#6ba8d0" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <section className="analytics-chart-card monthly-trend-card">
            <div className="section-heading">
              <div>
                <h2>Monthly Glucose Trend</h2>
                <p>{formatMonth(trendMonth)}</p>
              </div>
            </div>

            <p className="chart-note">Some dates have no recorded readings.</p>
            {monthlySeries.every((item) => item.average === null) && (
              <p className="report-empty">No readings recorded for this month.</p>
            )}
            <div className="chart-scroll">
              <div
                className="chart-container monthly-chart-container"
                style={{ minWidth: `${Math.max(720, monthlySeries.length * 42)}px` }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySeries} margin={{ top: 16, right: 20, bottom: 12, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dce7f0" />
                    <XAxis
                      dataKey="reading_date"
                      interval={0}
                      tickFormatter={(value) => `${monthNames[Number(value.slice(5, 7)) - 1].slice(0, 3)} ${Number(value.slice(8, 10))}`}
                      tick={{ fill: '#1a2b3c', fontSize: 11 }}
                      angle={-35}
                      textAnchor="end"
                      height={68}
                    />
                    <YAxis
                      width={52}
                      tick={{ fill: '#1a2b3c', fontSize: 12 }}
                      label={{ value: 'mg/dL', angle: -90, position: 'insideLeft', fill: '#1a2b3c' }}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="average"
                      name="Daily average"
                      stroke="#4a8fb8"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#4a8fb8' }}
                      activeDot={{ r: 6 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  )
}

export default VisualAnalytics
