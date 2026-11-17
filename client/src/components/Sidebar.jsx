import { NavLink, useNavigate } from 'react-router-dom'

function NavigationIcon({ name }) {
  const iconAttributes = {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  }

  if (name === 'dashboard') {
    return (
      <svg {...iconAttributes}>
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="5" rx="1" />
        <rect x="13" y="10" width="8" height="11" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
      </svg>
    )
  }

  if (name === 'reports') {
    return (
      <svg {...iconAttributes}>
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 4 3 6-7" />
      </svg>
    )
  }

  if (name === 'history') {
    return (
      <svg {...iconAttributes}>
        <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }

  if (name === 'profile') {
    return (
      <svg {...iconAttributes}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </svg>
    )
  }

  return (
    <svg {...iconAttributes}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
    </svg>
  )
}

function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>Sweety</h2>
        <p>Blood Glucose Tracker</p>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <NavLink to="/dashboard" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <NavigationIcon name="dashboard" />
          Dashboard
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <NavigationIcon name="reports" />
          Reports
        </NavLink>
        <NavLink to="/reading-history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <NavigationIcon name="history" />
          Reading History
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <NavigationIcon name="profile" />
          Profile
        </NavLink>
        <button className="logout-button sidebar-logout" onClick={handleLogout}>
          <NavigationIcon name="logout" />
          Logout
        </button>
      </nav>
    </aside>
  )
}

export default Sidebar
