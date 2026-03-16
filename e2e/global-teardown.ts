import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

export default async function globalTeardown() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const backendDir = path.resolve(__dirname, '../../ai-dash-backend')

  execSync(
    'source .venv/bin/activate && python -m app.auth.e2e_reset',
    { cwd: backendDir, shell: '/bin/zsh', stdio: 'inherit' }
  )
}
