const express = require('express')
const cors = require('cors')

require('./config/db')

const authRoutes = require('./routes/authRoutes')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Sweety API is running!')
})

// Authentication routes
app.use('/api/auth', authRoutes)

module.exports = app