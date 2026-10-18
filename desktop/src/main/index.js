import { app, shell, BrowserWindow, ipcMain, safeStorage } from 'electron'
import 'dotenv/config'
import { spawn } from 'child_process'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let backendProcess = null

async function requestCloudBackend(path, options = {}) {
  const cloudUrl = process.env.VEDA_CLOUD_API_URL ||
    (is.dev ? 'http://127.0.0.1:8080' : 'https://veda-api.onrender.com')
  const response = await fetch(`${cloudUrl}${path}`, options)
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.detail || result.message || `Cloud request failed: ${response.status}`)
  return result
}

const cloudAuthFile = () => join(app.getPath('userData'), 'cloud-auth.bin')
const geminiConfigFile = () => join(app.getPath('userData'), 'gemini.bin')

async function saveCloudAuthToken(token) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure token storage is unavailable on this system.')
  }
  await writeFile(cloudAuthFile(), safeStorage.encryptString(token))
}

async function loadCloudAuthToken() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null
    return safeStorage.decryptString(await readFile(cloudAuthFile()))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function clearCloudAuthToken() {
  await unlink(cloudAuthFile()).catch((error) => {
    if (error.code !== 'ENOENT') throw error
  })
}

async function loadGeminiConfig() {
  try {
    const encryptedConfig = await readFile(geminiConfigFile())
    return JSON.parse(safeStorage.decryptString(encryptedConfig))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function verifyGeminiApiKey(apiKey) {
  let response
  try {
    response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models',
      { headers: { 'x-goog-api-key': apiKey } }
    )
  } catch {
    throw new Error('Could not reach Gemini. Check your internet connection and try again.')
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error?.message || 'Gemini rejected this API key.')
  }

  const models = Array.isArray(result.models) ? result.models : []
  const supportedModels = models.filter((model) =>
    model.supportedGenerationMethods?.includes('generateContent')
  )
  const preferredNames = [
    'models/gemini-2.5-flash',
    'models/gemini-2.0-flash',
    'models/gemini-1.5-flash'
  ]
  const selectedModel =
    preferredNames.find((name) => supportedModels.some((model) => model.name === name)) ||
    supportedModels.find((model) => model.name.toLowerCase().includes('flash'))?.name ||
    supportedModels[0]?.name

  if (!selectedModel) {
    throw new Error('This Gemini API key has no available text-generation model.')
  }

  let generationResponse
  try {
    generationResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with OK.' }] }],
          generationConfig: { maxOutputTokens: 4, temperature: 0 }
        })
      }
    )
  } catch {
    throw new Error('Could not verify Gemini text generation. Check your internet connection.')
  }
  const generationResult = await generationResponse.json().catch(() => ({}))
  if (!generationResponse.ok || !generationResult.candidates?.length) {
    throw new Error(generationResult.error?.message || 'This key cannot generate content with Gemini.')
  }
  return selectedModel
}

function startBackend() {
  if (process.env.VEDA_BACKEND_MANAGED === '1') {
    return
  }

  const backendRoot = app.isPackaged
    ? join(process.resourcesPath, 'backend')
    : join(__dirname, '../../../backend')
  const backendEntry = app.isPackaged
    ? join(backendRoot, process.platform === 'win32' ? 'VEDA-Backend.exe' : 'VEDA-Backend')
    : join(backendRoot, 'main.py')
  const pythonCommand =
    process.platform === 'win32'
      ? process.env.VEDA_PYTHON || 'py'
      : process.env.VEDA_PYTHON || 'python3'
  const usesPyLauncher = process.platform === 'win32' && pythonCommand === 'py'
  const backendCommand = app.isPackaged ? backendEntry : pythonCommand
  const pythonArgs = app.isPackaged ? [] : usesPyLauncher ? ['-3', backendEntry] : [backendEntry]

  try {
    backendProcess = spawn(backendCommand, pythonArgs, {
      cwd: backendRoot,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        VEDA_PORT: process.env.VEDA_PORT || '8010',
        VEDA_HOST: process.env.VEDA_HOST || '127.0.0.1',
        VEDA_DATA_DIR: process.env.VEDA_DATA_DIR || app.getPath('userData')
      },
      stdio: 'inherit'
    })

    backendProcess.on('error', (error) => {
      console.error('Backend startup failed:', error)
    })
  } catch (error) {
    console.error('Failed to start backend:', error)
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('auth-login', async (_event, credentials) => {
    const result = await requestCloudBackend('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
    await saveCloudAuthToken(result.access_token)
    return { success: true, user_id: result.user_id, email: result.email }
  })
  ipcMain.handle('auth-register', async (_event, credentials) => {
    const result = await requestCloudBackend('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
    await saveCloudAuthToken(result.access_token)
    return { success: true, user_id: result.user_id, email: result.email }
  })
  ipcMain.handle('auth-logout', async () => {
    await clearCloudAuthToken()
  })
  ipcMain.handle('generate-qr-token', async () => {
    const result = await requestCloudBackend('/auth/qr/generate')
    return result.qrToken
  })
  ipcMain.handle('verify-qr-status', async (_event, qrToken) => {
    if (typeof qrToken !== 'string' || qrToken.length > 100) return false
    const result = await requestCloudBackend(`/auth/qr/status/${encodeURIComponent(qrToken)}`)
    if (result.status !== 'APPROVED' || !result.accessToken) return false
    await saveCloudAuthToken(result.accessToken)
    return true
  })
  ipcMain.handle('gemini-key-status', async () => {
    const config = await loadGeminiConfig()
    return { configured: Boolean(config?.apiKey && config?.model), model: config?.model || null }
  })
  ipcMain.handle('gemini-key-save', async (_event, apiKey) => {
    if (typeof apiKey !== 'string' || apiKey.trim().length < 20 || apiKey.length > 512) {
      throw new Error('Enter a valid Gemini API key.')
    }
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure API-key storage is unavailable on this system.')
    }
    const normalizedKey = apiKey.trim()
    const model = await verifyGeminiApiKey(normalizedKey)
    const encryptedConfig = safeStorage.encryptString(
      JSON.stringify({ apiKey: normalizedKey, model })
    )
    await writeFile(geminiConfigFile(), encryptedConfig)
    return { configured: true, model }
  })
  ipcMain.handle('gemini-key-remove', async () => {
    await unlink(geminiConfigFile()).catch((error) => {
      if (error.code !== 'ENOENT') throw error
    })
    return { configured: false }
  })
  ipcMain.handle('desktop-command', async (_event, text) => {
    if (typeof text !== 'string' || text.trim().length < 1 || text.length > 2000) {
      throw new Error('Command must contain 1 to 2000 characters.')
    }
    const token = await loadCloudAuthToken()
    if (!token) throw new Error('Sign in before sending a message.')
    const result = await requestCloudBackend('/api/chat/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() })
    })
    return { result: result.status === 'QUEUED'
      ? `Task queued (${result.id}). Waiting for a connected desktop agent.`
      : result.text }
  })
  ipcMain.handle('check-login-status', async () => {
    const token = await loadCloudAuthToken()
    if (token) {
      try {
        await requestCloudBackend('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        return true
      } catch {
        await clearCloudAuthToken()
      }
    }
    return false
  })
  ipcMain.on('ping', () => console.log('pong'))
  startBackend()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill('SIGTERM')
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill('SIGTERM')
  }
})
