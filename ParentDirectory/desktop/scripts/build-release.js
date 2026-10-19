const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const yaml = require('js-yaml')

const projectRoot = path.resolve(__dirname, '..')
const releaseDirectory = path.resolve(projectRoot, '../../webui/downloads')
const stagingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'veda-release-'))
const builderCli = path.join(projectRoot, 'node_modules', 'electron-builder', 'cli.js')
const backendBuildInfo = JSON.parse(
  fs.readFileSync(path.join(os.tmpdir(), 'veda-backend-build-path.json'), 'utf8')
)
const backendBundlePath = backendBuildInfo.bundlePath
if (!fs.existsSync(backendBundlePath)) {
  throw new Error(`Bundled backend not found: ${backendBundlePath}`)
}

const configPath = path.join(projectRoot, '.electron-builder.generated.yml')
const config = yaml.load(fs.readFileSync(path.join(projectRoot, 'electron-builder.yml'), 'utf8'))
config.directories.output = stagingDirectory
config.extraResources = [{ from: backendBundlePath, to: 'backend' }]
fs.writeFileSync(configPath, yaml.dump(config, { noRefs: true }))

const result = spawnSync(
  process.execPath,
  [builderCli, ...process.argv.slice(2), '--config', configPath],
  { cwd: projectRoot, stdio: 'inherit' }
)
fs.rmSync(configPath, { force: true })

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status || 1)

fs.mkdirSync(releaseDirectory, { recursive: true })
const artifacts = fs
  .readdirSync(stagingDirectory)
  .filter((filename) => /\.(exe|dmg|appimage)$/i.test(filename))

if (artifacts.length === 0) {
  throw new Error(`Electron Builder produced no release artifacts in ${stagingDirectory}`)
}

for (const filename of artifacts) {
  fs.copyFileSync(path.join(stagingDirectory, filename), path.join(releaseDirectory, filename))
}

fs.rmSync(stagingDirectory, { recursive: true, force: true })
