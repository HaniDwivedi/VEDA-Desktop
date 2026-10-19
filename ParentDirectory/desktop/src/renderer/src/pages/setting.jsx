import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'

const runtimeDetails = [
  ['Desktop actions', 'Laptop-local allowlist: open/close supported applications'],
  ['AI assistant', 'Gemini natural-language requests using your encrypted API key'],
  ['Account storage', 'Local SQLite; PostgreSQL migration is not configured'],
  ['Controller tickets', 'Redis when VEDA_REDIS_URL is set; process memory in development'],
  ['Cloud relay', 'Not configured'],
  ['Screen context to AI', 'Not shared with Gemini']
]

export default function Settings({ onNavigate }) {
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState({ configured: false, model: null })
  const [statusMessage, setStatusMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    window.electron.ipcRenderer
      .invoke('gemini-key-status')
      .then((status) => {
        if (mounted) setKeyStatus(status)
      })
      .catch(() => {
        if (mounted) setStatusMessage('Could not read the saved key status.')
      })
    return () => {
      mounted = false
    }
  }, [])

  const saveApiKey = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setStatusMessage('Verifying API key with Gemini...')
    try {
      const result = await window.electron.ipcRenderer.invoke('gemini-key-save', apiKey)
      setKeyStatus(result)
      setApiKey('')
      setStatusMessage(`Verified. Using ${result.model.replace('models/', '')}.`)
    } catch (error) {
      setStatusMessage(error.message || 'Could not verify this API key.')
    } finally {
      setIsSaving(false)
    }
  }

  const removeApiKey = async () => {
    await window.electron.ipcRenderer.invoke('gemini-key-remove')
    setKeyStatus({ configured: false, model: null })
    setStatusMessage('Gemini API key removed.')
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between border-b border-gray-800 pb-5">
          <div>
            <p className="mb-2 text-xs font-mono uppercase tracking-wider text-indigo-300">
              Runtime
            </p>
            <h1 className="text-2xl font-semibold">V.E.D.A. status</h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('chat')}
            className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-900"
          >
            Back
          </button>
        </header>
        <section className="mb-8 border-b border-gray-800 pb-7">
          <h2 className="mb-2 text-lg font-semibold">Gemini API key</h2>
          <p className="mb-4 max-w-xl text-sm leading-6 text-gray-400">
            Add your own Google AI Studio key for natural-language requests. It is verified and
            encrypted on this device. Verification uses a small amount of Gemini quota; your
            screen and files are not sent to Gemini.
          </p>
          <form onSubmit={saveApiKey} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={keyStatus.configured ? 'Enter a new key to replace the saved key' : 'Paste Gemini API key'}
              aria-label="Gemini API key"
              className="min-w-0 flex-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={isSaving || apiKey.trim().length < 20}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Checking...' : 'Verify and save'}
            </button>
            {keyStatus.configured && (
              <button
                type="button"
                onClick={removeApiKey}
                className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-900"
              >
                Remove key
              </button>
            )}
          </form>
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-gray-400">
            {statusMessage ||
              (keyStatus.configured
                ? `Key verified: ${keyStatus.model?.replace('models/', '')}`
                : 'No Gemini key saved. Explicit app open/close commands still work.')}
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-indigo-300 hover:text-indigo-200"
          >
            Get a Gemini API key
          </a>
        </section>
        <dl className="divide-y divide-gray-800">
          {runtimeDetails.map(([label, detail]) => (
            <div key={label} className="grid gap-2 py-4 sm:grid-cols-[180px_1fr]">
              <dt className="text-sm font-medium text-gray-200">{label}</dt>
              <dd className="text-sm leading-6 text-gray-400">{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  )
}

Settings.propTypes = {
  onNavigate: PropTypes.func.isRequired
}
