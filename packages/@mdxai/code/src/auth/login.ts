import { storeToken, type TokenData } from './token.js'

export interface LoginOptions {
  baseUrl?: string
  scopes?: string[]
}

/**
 * Perform OAuth login flow
 * TODO: Integrate with oauth.do when available
 */
export async function login(options: LoginOptions = {}): Promise<TokenData> {
  const baseUrl = options.baseUrl ?? 'https://agents.do'
  const scopes = options.scopes ?? ['sessions:write', 'sessions:read']

  // For now, this is a placeholder
  // In production, this would:
  // 1. Open browser to oauth.do authorization page
  // 2. Start local server to receive callback
  // 3. Exchange code for token
  // 4. Store token

  console.log('Login flow not yet implemented')
  console.log('Please set MDXAI_TOKEN environment variable')
  console.log(`Scopes: ${scopes.join(', ')}`)

  throw new Error('Login not implemented - use MDXAI_TOKEN environment variable')
}

/**
 * Logout and clear stored credentials
 */
export async function logout(): Promise<void> {
  const { clearToken } = await import('./token.js')
  await clearToken()
  console.log('Logged out successfully')
}
