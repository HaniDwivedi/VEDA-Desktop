# desktop

An Electron application with React

## Prerequisites

- Node.js and npm
- Python 3.13 on Windows, with `../backend/requirement.txt` installed

From this directory, install the Python dependencies and create a local environment file:

```powershell
py -3 -m pip install -r ../backend/requirement.txt
Copy-Item ../backend/.env.example ../backend/.env
npm install
```

Then run `npm run dev`. Keep `.env` out of source control; host environment variables override values from that file.

## Agent And Production Configuration

Open **Settings** in the desktop app and paste a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). The app verifies the key, then encrypts it with the operating system's secure storage. The key is never included in the download or returned to the renderer. Gemini receives the text of natural-language requests; screen contents and files are not sent. Direct commands such as `@agent open chrome` and `@agent close vscode` work without a key. The agent can only launch or close explicitly allowlisted applications. The separate `veda/` planner remains a mock.

For a hosted production backend, set `VEDA_ENV=production`, provide a unique `VEDA_JWT_SECRET` with at least 32 characters, and set `VEDA_CORS_ORIGINS` to explicit HTTPS origins. Redis is optional for local development and required for production WebSocket ticket issuance (`/api/auth/ws-ticket`). Do not commit production secrets. The PyInstaller build reads a `.env` beside the backend executable if one is provided; otherwise configure the process environment.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
