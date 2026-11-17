import { useEffect, useState } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import './Dashboard.css'
import './Profile.css'

function Profile() {
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [originalName, setOriginalName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/profile')
        setProfile(response.data.profile)
        setName(response.data.profile.name)
        setEmail(response.data.profile.email)
        setOriginalName(response.data.profile.name)
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
          'Unable to load your profile. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name cannot be empty.')
      return
    }

    setSavingProfile(true)
    try {
      const response = await api.put('/profile', { name: trimmedName })
      const updatedProfile = response.data.profile
      setProfile(updatedProfile)
      setName(updatedProfile.name)
      setEmail(updatedProfile.email)
      setOriginalName(updatedProfile.name)
      setIsEditingName(false)

      const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}')
      sessionStorage.setItem(
        'user',
        JSON.stringify({
          ...storedUser,
          name: updatedProfile.name,
          email: updatedProfile.email
        })
      )
      setSuccess(response.data.message || 'Profile updated successfully')
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to update your profile. Please try again.'
      )
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelNameEdit = () => {
    setName(originalName)
    setIsEditingName(false)
    setError('')
    setSuccess('')
  }

  const handlePasswordChange = (event) => {
    const { name: field, value } = event.target
    setPasswords((current) => ({ ...current, [field]: value }))
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    if (passwords.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }

    setSavingPassword(true)
    try {
      const response = await api.put('/profile/password', passwords)
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setSuccess(response.data.message)
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to change your password. Please try again.'
      )
    } finally {
      setSavingPassword(false)
    }
  }

  const createdDate = profile?.created_at
    ? String(profile.created_at).slice(0, 10)
    : 'Not available'

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Profile</h1>
            <p>Manage your account details and password</p>
          </div>
        </header>

        {error && <p className="form-error profile-feedback">{error}</p>}
        {success && <p className="form-success profile-feedback">{success}</p>}

        {loading ? (
          <p className="profile-status">Loading profile...</p>
        ) : profile ? (
          <div className="profile-panels">
            <section className="reading-form-section profile-card">
              <div className="section-heading profile-card-header">
                <div>
                  <h2>Personal Information</h2>
                  <p>Your account details</p>
                </div>
                {!isEditingName && (
                  <button
                    type="button"
                    className="profile-edit-button"
                    aria-label="Edit name"
                    onClick={() => {
                      setIsEditingName(true)
                      setError('')
                      setSuccess('')
                    }}
                  >
                    ✎
                  </button>
                )}
              </div>

              <form className="profile-form" onSubmit={handleSaveProfile}>
                <div className="form-field">
                  <label htmlFor="profile-name">Name</label>
                  <input
                    id="profile-name"
                    value={name}
                    maxLength={100}
                    onChange={(event) => setName(event.target.value)}
                    readOnly={!isEditingName}
                    disabled={!isEditingName}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="profile-email">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    maxLength={254}
                    value={email}
                    readOnly
                    disabled
                  />
                </div>

                <p className="profile-created">Account creation date: {createdDate}</p>

                {isEditingName && (
                  <div className="profile-edit-actions">
                    <button className="profile-submit" type="submit" disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="profile-cancel"
                      onClick={handleCancelNameEdit}
                      disabled={savingProfile}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </section>

            <section className="reading-form-section profile-card">
              <div className="section-heading">
                <div>
                  <h2>Change Password</h2>
                  <p>Choose a password with at least 8 characters.</p>
                </div>
              </div>

              <form className="profile-form" onSubmit={handleChangePassword}>
                <div className="form-field">
                  <label htmlFor="current-password">Current password</label>
                  <input
                    id="current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <button className="profile-submit" type="submit" disabled={savingPassword}>
                  {savingPassword ? 'Changing...' : 'Change password'}
                </button>
              </form>
            </section>
          </div>
        ) : (
          <p className="profile-status">Unable to load profile.</p>
        )}
      </main>
    </div>
  )
}

export default Profile
