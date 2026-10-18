import { useState } from 'react'
import PropTypes from 'prop-types'

export default function Login({ onNavigate }) {
  // States
  const [isRegister, setIsRegister] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Handle Form Submit (Login or Register)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    try {
      const result = await window.electron.ipcRenderer.invoke(
        isRegister ? 'auth-register' : 'auth-login',
        { email: emailOrPhone.trim(), password, fullName: '' }
      )
      if (result.success) onNavigate('chat')
    } catch (error) {
      setErrorMessage(
        error.message || 'Authentication failed. Check your connection and try again.'
      )
    }
  }

  // Handle Social Authentication
  const handleSocialAuth = (provider) => {
    console.log(`Initiating ${provider} Authentication...`)
  }

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen p-6 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}
    >
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="absolute top-6 right-6 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 shadow-md transition"
      >
        {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>

      {/* Main Card Container */}
      <div
        className={`w-full max-w-md p-8 rounded-2xl shadow-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
      >
        {/* Header Text */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1">
            {isRegister ? 'Create V.E.D.A. Account' : 'Welcome Back'}
          </h1>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {isRegister
              ? 'Register to connect desktop & mobile ecosystem'
              : 'Enter your credentials to access your workspace'}
          </p>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 text-xs bg-red-900/50 border border-red-700 text-red-200 rounded-xl text-center">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Email address</label>
            <input
              type="email"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="name@example.com"
              required
              className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-black placeholder-gray-400'}`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={isRegister ? 12 : 1}
              required
              className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-black placeholder-gray-400'}`}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition shadow-lg mt-2 text-sm"
          >
            {isRegister ? 'Register Account' : 'Login'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div
            className={`flex-grow border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-300'}`}
          ></div>
          <span className={`px-3 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            OR CONNECT WITH
          </span>
          <div
            className={`flex-grow border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-300'}`}
          ></div>
        </div>

        {/* Social Auth Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleSocialAuth('Google')}
            className={`w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium border transition ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm'}`}
          >
            <span>🌐</span> Continue with Google
          </button>

          <button
            onClick={() => handleSocialAuth('Microsoft')}
            className={`w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium border transition ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm'}`}
          >
            <span>🪟</span> Continue with Microsoft
          </button>
        </div>

        {/* Toggle View */}
        <div className="mt-6 text-center text-xs">
          {isRegister ? (
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Already have an account?{' '}
              <button
                onClick={() => setIsRegister(false)}
                className="text-indigo-400 font-medium hover:underline focus:outline-none"
              >
                Login here
              </button>
            </p>
          ) : (
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              New to V.E.D.A.?{' '}
              <button
                onClick={() => setIsRegister(true)}
                className="text-indigo-400 font-medium hover:underline focus:outline-none"
              >
                Create new account
              </button>
            </p>
          )}
        </div>

        {/* Back option */}
        <div className="mt-4 text-center">
          <button
            onClick={() => onNavigate('home')}
            className="text-xs text-gray-500 hover:text-gray-300 underline transition"
          >
            ← Back to QR Pairing screen
          </button>
        </div>
      </div>
    </div>
  )
}

Login.propTypes = {
  onNavigate: PropTypes.func.isRequired
}
