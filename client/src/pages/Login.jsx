import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import glucoseMeterImage from '../assets/glucose-meter.svg'
import API from '../services/api'
import './Auth.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const submittedEmail = String(formData.get('email') || '')
    const submittedPassword = String(formData.get('password') || '')

    setError('')
    setLoading(true)

    try {
      const response = await API.post('/auth/login', {
        email: submittedEmail,
        password: submittedPassword
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
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-form-panel">
          <div className="auth-heading">
            <h1>Welcome back</h1>
            <p>Sign in to continue tracking your glucose readings.</p>
          </div>

          {error && (
            <div className="auth-messages">
              <p className="auth-error">{error}</p>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-password-wrap">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 5.1A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7.5a11.6 11.6 0 01-4.2 5.1" />
                      <path d="M6.1 6.1A11.6 11.6 0 001 12.5C2.7 16.9 7 20 12 20c1.6 0 3.1-.3 4.5-.9" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5C21.3 16.9 17 20 12 20S2.7 16.9 1 12.5z" />
                      <circle cx="12" cy="12.5" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Submit'}
            </button>
          </form>

          <div className="auth-footer">
            <span>
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </span>
          </div>
        </div>

        <div className="auth-visual" aria-hidden="true">
          <img className="auth-illustration" src={glucoseMeterImage} alt="" />
        </div>
      </div>
    </div>
  )
}

export default Login
