import { defineConfig } from 'vitest/config'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Simple .env parser
function loadEnvFile(dir: string): Record<string, string> {
  const envPath = resolve(dir, '.env')
  if (!existsSync(envPath)) return {}

  const content = readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim()
      let value = trimmed.slice(eqIndex + 1).trim()
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
  }

  return env
}

const env = loadEnvFile(process.cwd())

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    env,
  },
})
