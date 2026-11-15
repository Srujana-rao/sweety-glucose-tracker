
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../services/api'
import './Signup.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const response = await API.post('/auth/login', {
        email,
        password
      })

      // Store authentication details temporarily
      sessionStorage.setItem('token', response.data.token)
      sessionStorage.setItem(
        'user',
        JSON.stringify(response.data.user)
      )

      // Navigate to dashboard
      navigate('/dashboard')

    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Login failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h1>Welcome Back!</h1>
        <p>Login to your Sweety account.</p>

        {error && <p className="error-message">{error}</p>}

        <form className="signup-form" onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <button
            type="button"
            className="google-button"
            onClick={() => setError('Google Sign-in will be configured next.')}
          >
            Continue with Google
          </button>
        </form>

        <div className="signup-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
