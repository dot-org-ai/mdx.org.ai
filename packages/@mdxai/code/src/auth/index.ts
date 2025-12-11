import { loadToken, isTokenExpired, type TokenData } from './token.js'
import { login } from './login.js'

/**
 * Get a valid authentication token
 */
export async function getAuthToken(): Promise<string> {
  // Check environment variable first
  const envToken = process.env.MDXAI_TOKEN
  if (envToken) {
    return envToken
  }

  // Try to load stored token
  const token = await loadToken()
  if (token && !isTokenExpired(token)) {
    return token.accessToken
  }

  // Need to login
  throw new Error(
    'Not authenticated. Please run "mdxai-code login" or set MDXAI_TOKEN environment variable'
  )
}

/**
 * Create auth headers for API requests
 */
export function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export { storeToken, loadToken, isTokenExpired, clearToken } from './token.js'
export { login, logout } from './login.js'
export type { TokenData } from './token.js'
export type { LoginOptions } from './login.js'
