
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const navigate = useNavigate()

  const user = JSON.parse(
    sessionStorage.getItem('user') || 'null'
  )

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')

    navigate('/login')
  }

  return (
    <div>
      <h1>Welcome to Sweety!</h1>

      <p>
        Hello, {user?.name || 'User'}!
      </p>

      <p>Your blood glucose dashboard will appear here.</p>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}

export default Dashboard
