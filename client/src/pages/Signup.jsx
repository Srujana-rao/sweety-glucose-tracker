
import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Signup.css'

function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()

    console.log('Name:', name)
    console.log('Email:', email)
    console.log('Password:', password)
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h1>Create your Sweety account</h1>
        <p>Start tracking your blood glucose readings.</p>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div>
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit">Create Account</button>
        </form>

        <div className="signup-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  )
}

export default Signup
