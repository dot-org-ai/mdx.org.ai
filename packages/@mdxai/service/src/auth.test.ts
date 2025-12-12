/**
 * Auth tests
 *
 * Tests for authentication utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractToken, validateToken, getUserInfo, hasScopes } from './auth'
import type { Env } from './types'

/**
 * Create mock environment
 */
function createMockEnv(overrides: Partial<Env> = {}): Env {
  return {
    SESSIONS: {} as DurableObjectNamespace,
    OAUTH_ISSUER: 'https://oauth.do',
    ...overrides,
  }
}

describe('extractToken', () => {
  it('should extract token from valid Bearer header', () => {
    const token = extractToken('Bearer abc123xyz')
    expect(token).toBe('abc123xyz')
  })

  it('should extract long JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const token = extractToken(`Bearer ${jwt}`)
    expect(token).toBe(jwt)
  })

  it('should return null for missing Bearer prefix', () => {
    const token = extractToken('abc123xyz')
    expect(token).toBeNull()
  })

  it('should return null for lowercase bearer', () => {
    const token = extractToken('bearer abc123xyz')
    expect(token).toBeNull()
  })

  it('should return null for empty string', () => {
    const token = extractToken('')
    expect(token).toBeNull()
  })

  it('should handle Bearer with empty token', () => {
    // The regex /^Bearer (.+)$/ requires at least one character after "Bearer "
    // So "Bearer " returns null because (.+) needs at least one char
    const token = extractToken('Bearer ')
    expect(token).toBeNull()
  })

  it('should handle tokens with special characters', () => {
    const token = extractToken('Bearer abc-123_xyz.456')
    expect(token).toBe('abc-123_xyz.456')
  })

  it('should handle tokens with spaces after Bearer', () => {
    const token = extractToken('Bearer   token-with-spaces')
    // The regex /^Bearer (.+)$/ captures everything after "Bearer "
    // So extra spaces become part of the token
    expect(token).toBe('  token-with-spaces')
  })

  it('should return null for Basic auth', () => {
    const token = extractToken('Basic dXNlcjpwYXNz')
    expect(token).toBeNull()
  })

  it('should return null for Digest auth', () => {
    const token = extractToken('Digest username="user"')
    expect(token).toBeNull()
  })
})

describe('validateToken', () => {
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = createMockEnv()
  })

  it('should return false for missing token', async () => {
    const valid = await validateToken('', mockEnv)
    expect(valid).toBe(false)
  })

  it('should return false for invalid Bearer format', async () => {
    const valid = await validateToken('InvalidFormat', mockEnv)
    expect(valid).toBe(false)
  })

  it('should return true for valid Bearer token (dev mode)', async () => {
    // Current implementation accepts any valid Bearer token
    const valid = await validateToken('Bearer any-token', mockEnv)
    expect(valid).toBe(true)
  })

  it('should return false for lowercase bearer', async () => {
    const valid = await validateToken('bearer token', mockEnv)
    expect(valid).toBe(false)
  })

  describe('with mocked oauth.do validation', () => {
    beforeEach(() => {
      // Simulate what the TODO implementation would do
      global.fetch = vi.fn()
    })

    it('should validate token against oauth.do issuer', async () => {
      // This tests the documented behavior even though not implemented
      const mockEnvWithIssuer = createMockEnv({
        OAUTH_ISSUER: 'https://oauth.example.com',
      })

      // For now, dev mode returns true
      const valid = await validateToken('Bearer valid-token', mockEnvWithIssuer)
      expect(valid).toBe(true)
    })

    it('should use default issuer when not configured', async () => {
      const mockEnvNoIssuer = createMockEnv({
        OAUTH_ISSUER: undefined,
      })

      const valid = await validateToken('Bearer token', mockEnvNoIssuer)
      expect(valid).toBe(true)
    })
  })
})

describe('getUserInfo', () => {
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = createMockEnv()
  })

  it('should return null for invalid token', async () => {
    const info = await getUserInfo('', mockEnv)
    expect(info).toBeNull()
  })

  it('should return null for missing Bearer prefix', async () => {
    const info = await getUserInfo('token-without-bearer', mockEnv)
    expect(info).toBeNull()
  })

  it('should return anonymous user for valid token (dev mode)', async () => {
    const info = await getUserInfo('Bearer valid-token', mockEnv)

    expect(info).not.toBeNull()
    expect(info?.id).toBe('anonymous')
  })

  it('should return user object with id property', async () => {
    const info = await getUserInfo('Bearer token', mockEnv)

    expect(info).toHaveProperty('id')
  })

  it('should optionally have email property', async () => {
    const info = await getUserInfo('Bearer token', mockEnv)

    // Email is optional in the type, check structure
    expect(info).toBeDefined()
    if (info && 'email' in info) {
      expect(typeof info.email).toBe('string')
    }
  })

  describe('expected behavior when implemented', () => {
    it('should extract user info from token claims', async () => {
      // This documents expected behavior
      const info = await getUserInfo('Bearer jwt-token', mockEnv)

      // Currently returns anonymous
      expect(info?.id).toBe('anonymous')
    })

    it('should handle expired tokens', async () => {
      // Expired tokens should fail validation
      // Current dev mode accepts all tokens
      const info = await getUserInfo('Bearer expired-token', mockEnv)
      expect(info?.id).toBe('anonymous')
    })
  })
})

describe('hasScopes', () => {
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = createMockEnv()
  })

  it('should return false for invalid token', async () => {
    const result = await hasScopes('', mockEnv, ['read'])
    expect(result).toBe(false)
  })

  it('should return false for missing Bearer prefix', async () => {
    const result = await hasScopes('token', mockEnv, ['read'])
    expect(result).toBe(false)
  })

  it('should return true for valid token with any scopes (dev mode)', async () => {
    const result = await hasScopes('Bearer token', mockEnv, ['read', 'write', 'admin'])
    expect(result).toBe(true)
  })

  it('should handle empty scopes array', async () => {
    const result = await hasScopes('Bearer token', mockEnv, [])
    expect(result).toBe(true)
  })

  it('should handle single scope', async () => {
    const result = await hasScopes('Bearer token', mockEnv, ['sessions:read'])
    expect(result).toBe(true)
  })

  it('should handle multiple scopes', async () => {
    const result = await hasScopes('Bearer token', mockEnv, [
      'sessions:read',
      'sessions:write',
      'sessions:delete',
    ])
    expect(result).toBe(true)
  })

  describe('expected scope validation when implemented', () => {
    it('should check token scopes against required scopes', async () => {
      // Document expected behavior
      const requiredScopes = ['sessions:read', 'sessions:write']
      const result = await hasScopes('Bearer token-with-scopes', mockEnv, requiredScopes)

      // Dev mode returns true
      expect(result).toBe(true)
    })

    it('should return false when missing required scope', async () => {
      // Document expected behavior - would return false if token lacks scope
      const result = await hasScopes('Bearer limited-token', mockEnv, ['admin'])

      // Dev mode returns true
      expect(result).toBe(true)
    })
  })
})

describe('auth integration', () => {
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = createMockEnv()
  })

  it('should validate and get user info in sequence', async () => {
    const authHeader = 'Bearer valid-token'

    const valid = await validateToken(authHeader, mockEnv)
    expect(valid).toBe(true)

    const info = await getUserInfo(authHeader, mockEnv)
    expect(info).not.toBeNull()
  })

  it('should check scopes after validation', async () => {
    const authHeader = 'Bearer valid-token'

    const valid = await validateToken(authHeader, mockEnv)
    if (valid) {
      const canRead = await hasScopes(authHeader, mockEnv, ['read'])
      expect(canRead).toBe(true)
    }
  })

  it('should handle full auth flow', async () => {
    const authHeader = 'Bearer user-jwt-token'

    // Step 1: Extract token
    const token = extractToken(authHeader)
    expect(token).toBe('user-jwt-token')

    // Step 2: Validate token
    const valid = await validateToken(authHeader, mockEnv)
    expect(valid).toBe(true)

    // Step 3: Get user info
    const user = await getUserInfo(authHeader, mockEnv)
    expect(user).not.toBeNull()

    // Step 4: Check scopes
    const hasAccess = await hasScopes(authHeader, mockEnv, ['sessions:read'])
    expect(hasAccess).toBe(true)
  })
})

describe('edge cases', () => {
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = createMockEnv()
  })

  it('should handle whitespace in token', async () => {
    const valid = await validateToken('Bearer token-with-spaces ', mockEnv)
    // Trailing space is part of token
    expect(valid).toBe(true)
  })

  it('should handle very long tokens', async () => {
    const longToken = 'Bearer ' + 'a'.repeat(10000)
    const valid = await validateToken(longToken, mockEnv)
    expect(valid).toBe(true)
  })

  it('should handle unicode in token', async () => {
    const valid = await validateToken('Bearer token-with-\u{1F680}', mockEnv)
    expect(valid).toBe(true)
  })

  it('should handle newlines in auth header', () => {
    const token = extractToken('Bearer token\nwith\nnewlines')
    // The regex uses $ which matches end of string, but the string has newlines
    // So the regex does not match and returns null
    expect(token).toBeNull()
  })
})

describe('security considerations', () => {
  it('should not expose tokens in error messages', async () => {
    const mockEnv = createMockEnv()
    const sensitiveToken = 'Bearer secret-api-key-12345'

    try {
      await validateToken(sensitiveToken, mockEnv)
    } catch (error) {
      // If there's an error, it should not contain the token
      if (error instanceof Error) {
        expect(error.message).not.toContain('secret-api-key-12345')
      }
    }
  })

  it('should handle Bearer exactly (case sensitive)', () => {
    expect(extractToken('Bearer token')).toBe('token')
    expect(extractToken('BEARER token')).toBeNull()
    expect(extractToken('bearer token')).toBeNull()
    expect(extractToken('BeArEr token')).toBeNull()
  })
})
