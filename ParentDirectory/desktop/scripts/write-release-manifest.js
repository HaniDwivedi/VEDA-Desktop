const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const projectRoot = path.resolve(__dirname, '..')
const packageInfo = require(path.join(projectRoot, 'package.json'))
const downloadRoot = path.resolve(projectRoot, '../../webui/downloads')
const releaseFiles = {
  windows: `VEDA-${packageInfo.version}-Windows.exe`,
  macos: `VEDA-${packageInfo.version}-macOS.dmg`,
  linux: `VEDA-${packageInfo.version}-Linux.AppImage`
}

const verified = process.env.VEDA_RELEASE_VERIFIED === '1'
const artifacts = Object.fromEntries(
  Object.entries(releaseFiles).map(([platform, filename]) => {
    const artifactPath = path.join(downloadRoot, filename)
    if (!fs.existsSync(artifactPath)) return [platform, null]

    const contents = fs.readFileSync(artifactPath)
    return [
      platform,
      {
        filename,
        size: contents.length,
        sha256: crypto.createHash('sha256').update(contents).digest('hex')
      }
    ]
  })
)
const downloads = Object.fromEntries(
  Object.entries(artifacts).map(([platform, artifact]) => [
    platform,
    verified && artifact ? `./downloads/${artifact.filename}` : null
  ])
)

fs.mkdirSync(downloadRoot, { recursive: true })
fs.writeFileSync(
  path.join(downloadRoot, 'releases.json'),
  JSON.stringify({ version: packageInfo.version, verified, artifacts, downloads }, null, 2)
)
