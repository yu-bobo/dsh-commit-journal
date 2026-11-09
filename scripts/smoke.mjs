import { createRequire } from 'module'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { pathToFileURL } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nm = join(root, 'node_modules', '@deepseek-ai')

function stub(name, file) {
  const dir = join(nm, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: `@deepseek-ai/${name}`, type: 'module', main: './index.mjs' })
  )
  writeFileSync(join(dir, 'index.mjs'), file)
}

stub('dsh-tools', 'export function defineTool(def){return def}\n')
stub('cordis', 'export class Context {}\n')

const { startUiServer, stopUiServer, getDataRoot } = await import(
  pathToFileURL(join(root, 'lib/index.js')).href
)
const { listAccounts, createAccount } = await import(
  // Use data APIs via dynamic re-import of built plugin side effects only for UI
  pathToFileURL(join(root, 'lib/index.js')).href
).catch(() => ({}))

const url = await startUiServer(39283)
console.log('dataRoot', getDataRoot())
console.log('heatmap', url)
const home = await fetch(url)
const api = await fetch(url + 'api/accounts')
console.log('GET /', home.status)
console.log('GET /api/accounts', api.status, await api.text())
await stopUiServer()
console.log('smoke ok')
