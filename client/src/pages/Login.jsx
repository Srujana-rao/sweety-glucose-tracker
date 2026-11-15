
import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Signup.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()

    console.log('Email:', email)
    console.log('Password:', password)
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h1>Welcome Back!</h1>
        <p>Login to your Sweety account.</p>

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

          <button type="submit">Login</button>
          <button
  type="button"
  className="google-button"
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
