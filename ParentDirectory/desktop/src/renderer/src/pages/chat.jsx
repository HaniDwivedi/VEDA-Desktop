import { useState } from 'react'
import PropTypes from 'prop-types'
import Sidebar from '../components/Sidebar'
import MessageInput from '../components/MessageInput'

export default function Chat({ onNavigate }) {
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: 'Ready. Set your Gemini API key in Settings for natural-language requests. @agent open chrome and @agent close vscode work without a key.'
    }
  ])

  const [showStreamModal, setShowStreamModal] = useState(false)

  const handleLogout = async () => {
    try {
      await window.electron.ipcRenderer.invoke('auth-logout')
    } catch (error) {
      console.error('Could not revoke the desktop session:', error)
    } finally {
      onNavigate('login')
    }
  }

  const handleSendMessage = async (text, file) => {
    if (!text && !file) return

    // 1. Check for @stream command to trigger popup
    if (text.startsWith('@stream')) {
      setShowStreamModal(true)
      return
    }

    if (file) {
      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: text || `Attached ${file.name}`, file: file.name },
        { sender: 'agent', text: 'File uploads are not supported yet; no attachment was sent.' }
      ])
      return
    }

    setMessages((prev) => [...prev, { sender: 'user', text }])
    try {
      const response = await window.electron.ipcRenderer.invoke('desktop-command', text)
      setMessages((prev) => [
        ...prev,
        { sender: 'agent', text: response.result, channel: 'Local laptop API' }
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: 'agent', text: error.message || 'The laptop command failed.' }
      ])
    }
  }

  // Confirm Stream from Popup
  const confirmStartStream = () => {
    setShowStreamModal(false)
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: '@stream' },
      {
        sender: 'agent',
        text: 'Streaming is not connected in this chat view. No screen data was sent.'
      }
    ])
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden relative">
      <Sidebar onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col justify-between">
        {/* Top Header */}
        <div className="h-16 border-b border-gray-800 bg-gray-900 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm font-semibold">Authenticated desktop session</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStreamModal(true)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg text-white transition font-medium shadow-md"
            >
              🚀 Start Live Stream
            </button>
            <button
              onClick={handleLogout}
              className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-xl p-4 rounded-2xl text-sm flex flex-col gap-1 ${msg.sender === 'user' ? 'bg-indigo-600 self-end text-white' : 'bg-gray-900 border border-gray-800 self-start text-gray-200'}`}
              >
                <p>{msg.text}</p>
                <div className="flex items-center justify-between gap-4 mt-1 border-t border-white/10 pt-1.5">
                  {msg.file && (
                    <span className="text-xs bg-black/30 px-2 py-0.5 rounded">📎 {msg.file}</span>
                  )}
                  {msg.channel && (
                    <span className="text-[10px] opacity-75 font-mono tracking-wider">
                      {msg.channel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <MessageInput onSendMessage={handleSendMessage} />
      </div>

      {/* Stream Confirmation Popup Modal */}
      {showStreamModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xl mb-4 border border-indigo-500/30">
              📺
            </div>
            <h3 className="text-lg font-bold mb-1">Start Live Screen Stream?</h3>
            <p className="text-xs text-gray-400 mb-6">
              Streaming is not wired into this desktop chat view. No screen data will be sent.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setShowStreamModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-700 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartStream}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-lg transition"
              >
                Yes, Start Stream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

Chat.propTypes = {
  onNavigate: PropTypes.func.isRequired
}
