const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const backendRoot = path.resolve(projectRoot, '../backend')
const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'veda-backend-build-'))
const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'veda-backend-dist-'))
const pythonCommand = process.env.VEDA_PYTHON || (process.platform === 'win32' ? 'py' : 'python3')
const pythonPrefix = process.platform === 'win32' && pythonCommand === 'py' ? ['-3'] : []
const buildArgs = [
  ...pythonPrefix,
  '-m',
  'PyInstaller',
  '--noconfirm',
  '--clean',
  '--onedir',
  '--name',
  'VEDA-Backend',
  '--distpath',
  outputDirectory,
  '--workpath',
  workDirectory,
  '--specpath',
  workDirectory,
  '--paths',
  backendRoot,
  '--collect-all',
  'cv2',
  '--collect-all',
  'fastapi',
  '--collect-all',
  'uvicorn',
  '--collect-all',
  'mss',
  '--collect-all',
  'pyautogui',
  '--collect-all',
  'bcrypt',
  '--collect-all',
  'redis',
  '--hidden-import',
  'agent_brain',
  path.join(backendRoot, 'main.py')
]

const result = spawnSync(pythonCommand, buildArgs, { cwd: backendRoot, stdio: 'inherit' })
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status || 1)

fs.writeFileSync(
  path.join(os.tmpdir(), 'veda-backend-build-path.json'),
  JSON.stringify({ bundlePath: path.join(outputDirectory, 'VEDA-Backend') })
)
