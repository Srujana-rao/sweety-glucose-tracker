
const express = require('express')
const cors = require('cors')

require('./config/db')

const authRoutes = require('./routes/authRoutes')
const readingRoutes = require('./routes/readingRoutes')
const reportRoutes = require('./routes/reportRoutes')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Sweety API is running!')
})

app.use('/api/auth', authRoutes)
app.use('/api/readings', readingRoutes)
app.use('/api/reports', reportRoutes)

module.exports = app
