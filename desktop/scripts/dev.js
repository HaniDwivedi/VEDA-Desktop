const { spawn } = require('node:child_process')
const os = require('node:os')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const backendRoot = path.resolve(projectRoot, '../backend')

let pythonCommand = process.env.VEDA_PYTHON || (process.platform === 'win32' ? 'py' : 'python3')
let pythonArgs = ['main.py']

// GitHub Codespaces / Linux headless environment ke liye xvfb-run wrap karna
if (process.platform === 'linux') {
  pythonArgs = ['--auto-servernum', pythonCommand, ...pythonArgs]
  pythonCommand = 'xvfb-run'
}

const appDataRoot =
  process.env.LOCALAPPDATA ||
  process.env.XDG_DATA_HOME ||
  path.join(os.homedir(), '.local', 'share')
const dataDirectory = process.env.VEDA_DATA_DIR || path.join(appDataRoot, 'VEDA')

const backend = spawn(pythonCommand, pythonArgs, {
  cwd: backendRoot,
  env: {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    VEDA_BACKEND_MANAGED: '1',
    VEDA_PORT: process.env.VEDA_PORT || '8010',
    VEDA_DATA_DIR: dataDirectory
  },
  stdio: 'inherit'
})

const electron = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-vite', 'dev'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    VEDA_BACKEND_MANAGED: '1',
    VEDA_PORT: process.env.VEDA_PORT || '8010',
    VEDA_DATA_DIR: dataDirectory
  },
  stdio: 'inherit',
  shell: true
})

function shutdown(signal = 'SIGTERM') {
  if (backend && !backend.killed) {
    backend.kill(signal)
  }

  if (electron && !electron.killed) {
    electron.kill(signal)
  }
}

backend.on('exit', (code) => {
  if (code !== 0) {
    shutdown('SIGKILL')
    process.exit(code ?? 1)
  }
})

electron.on('exit', (code) => {
  shutdown('SIGKILL')
  process.exit(code ?? 0)
})

process.on('SIGINT', () => shutdown())
process.on('SIGTERM', () => shutdown())