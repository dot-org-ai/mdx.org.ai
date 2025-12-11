import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface TokenData {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

const TOKEN_DIR = join(homedir(), '.mdxai')
const TOKEN_FILE = join(TOKEN_DIR, 'token.json')

/**
 * Store authentication token
 */
export async function storeToken(token: TokenData): Promise<void> {
  await mkdir(TOKEN_DIR, { recursive: true })
  await writeFile(TOKEN_FILE, JSON.stringify(token, null, 2))
}

/**
 * Load authentication token
 */
export async function loadToken(): Promise<TokenData | null> {
  try {
    const data = await readFile(TOKEN_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: TokenData): boolean {
  if (!token.expiresAt) return false
  return Date.now() >= token.expiresAt
}

/**
 * Clear stored token
 */
export async function clearToken(): Promise<void> {
  try {
    await writeFile(TOKEN_FILE, JSON.stringify({}))
  } catch (error) {
    // Ignore errors
  }
}
