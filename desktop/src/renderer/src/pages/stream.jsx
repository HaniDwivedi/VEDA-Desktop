import PropTypes from 'prop-types'

export default function Stream({ onNavigate }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-gray-950 px-6 text-center text-white">
      <p className="text-xs font-mono uppercase tracking-wider text-indigo-300">Remote screen</p>
      <h1 className="text-2xl font-semibold">Cloud streaming is not configured</h1>
      <p className="max-w-lg text-sm leading-6 text-gray-400">
        LAN streaming is available through the mobile controller after the desktop is signed in.
        Public Internet streaming requires a deployed TLS relay; no direct laptop port should be
        exposed.
      </p>
      <button
        type="button"
        onClick={() => onNavigate('chat')}
        className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium hover:bg-indigo-500"
      >
        Return to desktop
      </button>
    </main>
  )
}

Stream.propTypes = {
  onNavigate: PropTypes.func.isRequired
}
