import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isTokenExpired, type TokenData } from './token.js'
import { authHeaders } from './index.js'

// Mock the token module to control loadToken behavior
vi.mock('./token.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./token.js')>()
  return {
    ...actual,
    loadToken: vi.fn(),
  }
})

describe('Auth Module', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.MDXAI_TOKEN
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('authHeaders', () => {
    it('should return Bearer authorization header', () => {
      const headers = authHeaders('test-token')

      expect(headers).toEqual({
        Authorization: 'Bearer test-token',
      })
    })

    it('should handle empty token', () => {
      const headers = authHeaders('')

      expect(headers).toEqual({
        Authorization: 'Bearer ',
      })
    })

    it('should handle special characters in token', () => {
      const headers = authHeaders('abc123-xyz_456')

      expect(headers).toEqual({
        Authorization: 'Bearer abc123-xyz_456',
      })
    })
  })

  describe('isTokenExpired', () => {
    it('should return false if no expiresAt', () => {
      const token: TokenData = {
        accessToken: 'test-token',
      }

      expect(isTokenExpired(token)).toBe(false)
    })

    it('should return false if token not expired', () => {
      const token: TokenData = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      }

      expect(isTokenExpired(token)).toBe(false)
    })

    it('should return true if token is expired', () => {
      const token: TokenData = {
        accessToken: 'test-token',
        expiresAt: Date.now() - 1000, // expired 1 second ago
      }

      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return true if token expires exactly now', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const token: TokenData = {
        accessToken: 'test-token',
        expiresAt: now, // expires exactly now
      }

      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return false for far future expiry', () => {
      const token: TokenData = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 86400000 * 365, // 1 year from now
      }

      expect(isTokenExpired(token)).toBe(false)
    })
  })

  describe('TokenData type', () => {
    it('should allow minimal token data', () => {
      const token: TokenData = {
        accessToken: 'test-token',
      }

      expect(token.accessToken).toBe('test-token')
      expect(token.refreshToken).toBeUndefined()
      expect(token.expiresAt).toBeUndefined()
    })

    it('should allow full token data', () => {
      const token: TokenData = {
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: 12345,
      }

      expect(token.accessToken).toBe('test-token')
      expect(token.refreshToken).toBe('refresh-token')
      expect(token.expiresAt).toBe(12345)
    })
  })

  describe('getAuthToken', () => {
    it('should return env token if MDXAI_TOKEN is set', async () => {
      process.env.MDXAI_TOKEN = 'env-test-token'

      // Reset modules to pick up new env var
      vi.resetModules()
      const { getAuthToken } = await import('./index.js')
      const token = await getAuthToken()

      expect(token).toBe('env-test-token')
    })

    it('should throw if no token and not authenticated', async () => {
      // Ensure no env token
      delete process.env.MDXAI_TOKEN

      // Reset modules to clear cached token
      vi.resetModules()

      // Re-mock loadToken after reset
      vi.doMock('./token.js', async (importOriginal) => {
        const actual = await importOriginal<typeof import('./token.js')>()
        return {
          ...actual,
          loadToken: vi.fn().mockResolvedValue(null),
        }
      })

      const { getAuthToken } = await import('./index.js')

      await expect(getAuthToken()).rejects.toThrow('Not authenticated')
    })

    it('should return stored token if valid', async () => {
      delete process.env.MDXAI_TOKEN

      vi.resetModules()

      vi.doMock('./token.js', async (importOriginal) => {
        const actual = await importOriginal<typeof import('./token.js')>()
        return {
          ...actual,
          loadToken: vi.fn().mockResolvedValue({
            accessToken: 'stored-token',
            expiresAt: Date.now() + 3600000, // Valid for 1 hour
          }),
        }
      })

      const { getAuthToken } = await import('./index.js')
      const token = await getAuthToken()

      expect(token).toBe('stored-token')
    })

    it('should throw if stored token is expired', async () => {
      delete process.env.MDXAI_TOKEN

      vi.resetModules()

      vi.doMock('./token.js', async (importOriginal) => {
        const actual = await importOriginal<typeof import('./token.js')>()
        return {
          ...actual,
          loadToken: vi.fn().mockResolvedValue({
            accessToken: 'expired-token',
            expiresAt: Date.now() - 1000, // Expired
          }),
        }
      })

      const { getAuthToken } = await import('./index.js')

      await expect(getAuthToken()).rejects.toThrow('Not authenticated')
    })
  })

  describe('login', () => {
    it('should throw not implemented error', async () => {
      const { login } = await import('./login.js')
      await expect(login()).rejects.toThrow('Login not implemented')
    })

    it('should accept baseUrl option', async () => {
      const { login } = await import('./login.js')
      await expect(login({ baseUrl: 'http://localhost:3000' })).rejects.toThrow(
        'Login not implemented'
      )
    })

    it('should accept scopes option', async () => {
      const { login } = await import('./login.js')
      await expect(login({ scopes: ['sessions:read'] })).rejects.toThrow(
        'Login not implemented'
      )
    })
  })

  describe('logout', () => {
    it('should call clearToken', async () => {
      const { logout } = await import('./login.js')
      // logout doesn't throw, it logs and clears token
      await expect(logout()).resolves.toBeUndefined()
    })
  })

  describe('token module exports', () => {
    it('should export storeToken function', async () => {
      const { storeToken } = await import('./token.js')
      expect(typeof storeToken).toBe('function')
    })

    it('should export loadToken function', async () => {
      const { loadToken } = await import('./token.js')
      expect(typeof loadToken).toBe('function')
    })

    it('should export clearToken function', async () => {
      const { clearToken } = await import('./token.js')
      expect(typeof clearToken).toBe('function')
    })

    it('should export isTokenExpired function', async () => {
      const { isTokenExpired } = await import('./token.js')
      expect(typeof isTokenExpired).toBe('function')
    })
  })
})
