import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export default async function globalSetup() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const backendDir = path.resolve(__dirname, '../../ai-dash-backend')

  // Load .env.e2e if present — values become available to all worker processes
  const envFile = path.resolve(__dirname, '../.env.e2e')
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let value = trimmed.slice(eqIdx + 1).trim()
      // Strip surrounding single or double quotes (e.g. KEY="value" or KEY='value')
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  }

  execSync(
    'source .venv/bin/activate && python -m app.auth.e2e_reset && python -m app.auth.db_create',
    { cwd: backendDir, shell: '/bin/zsh', stdio: 'inherit' }
  )
}
