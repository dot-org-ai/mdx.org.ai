/**
 * Authentication utilities for @mdxai/service
 *
 * Validates OAuth tokens from oauth.do
 */

import type { Env } from './types'

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string): string | null {
  const match = authHeader.match(/^Bearer (.+)$/)
  return match ? match[1] : null
}

/**
 * Validate OAuth token with oauth.do
 *
 * TODO: Implement proper token validation
 * This should:
 * 1. Extract token from Authorization header
 * 2. Verify token with oauth.do issuer
 * 3. Check token scopes
 * 4. Return user info
 */
export async function validateToken(
  authHeader: string,
  env: Env
): Promise<boolean> {
  const token = extractToken(authHeader)
  if (!token) {
    return false
  }

  // TODO: Implement actual validation
  // const issuer = env.OAUTH_ISSUER || 'https://oauth.do'
  // const response = await fetch(`${issuer}/validate`, {
  //   headers: { Authorization: `Bearer ${token}` },
  // })
  // return response.ok

  // For now, accept any token for development
  return true
}

/**
 * Get user info from token
 *
 * TODO: Implement user info extraction
 */
export async function getUserInfo(
  authHeader: string,
  env: Env
): Promise<{ id: string; email?: string } | null> {
  const valid = await validateToken(authHeader, env)
  if (!valid) {
    return null
  }

  // TODO: Implement actual user info extraction
  return {
    id: 'anonymous',
  }
}

/**
 * Check if token has required scopes
 *
 * TODO: Implement scope checking
 */
export async function hasScopes(
  authHeader: string,
  env: Env,
  requiredScopes: string[]
): Promise<boolean> {
  const valid = await validateToken(authHeader, env)
  if (!valid) {
    return false
  }

  // TODO: Implement actual scope checking
  return true
}
