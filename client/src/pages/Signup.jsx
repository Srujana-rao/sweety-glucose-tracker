import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import glucoseMeterImage from '../assets/glucose-meter.svg'
import API from '../services/api'
import './Auth.css'

function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const submittedName = String(formData.get('name') || '')
    const submittedEmail = String(formData.get('email') || '')
    const submittedPassword = String(formData.get('password') || '')
    const submittedConfirmPassword = String(formData.get('confirmPassword') || '')

    setError('')
    setSuccess('')

    if (submittedPassword !== submittedConfirmPassword) {
      setError('Password and confirmation do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await API.post('/auth/register', {
        name: submittedName,
        email: submittedEmail,
        password: submittedPassword
      })

      setSuccess(response.data.message)

      setTimeout(() => {
        navigate('/login')
      }, 1000)

    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Unable to create account. Please try again.'
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
            <h1>Create an account</h1>
            <p>Sign up and start tracking your blood glucose readings.</p>
          </div>

          {(error || success) && (
            <div className="auth-messages">
              {error && <p className="auth-error">{error}</p>}
              {success && <p className="auth-success">{success}</p>}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                name="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="signup-password">Password</label>
              <div className="auth-password-wrap">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
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

            <div className="auth-field">
              <label htmlFor="signup-confirm-password">Confirm password</label>
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Submit'}
            </button>
          </form>

          <div className="auth-footer">
            <span>
              Have an account? <Link to="/login">Sign in</Link>
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

export default Signup
