import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'

describe('useAuth', () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  })

  it('returns null token initially when no stored token', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.token).toBeNull()
  })

  it('returns isLoading false after initialization', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    // After effect runs, should be done loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('returns isLoading false after checking localStorage', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('returns isAuthenticated false when no token', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(false)
  })

  it('loads stored token from localStorage on mount', async () => {
    localStorageMock.getItem.mockReturnValue('stored_token_123')

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.token).toBe('stored_token_123')
    expect(result.current.isAuthenticated).toBe(true)
    expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token')
  })

  it('login creates mock token and stores it', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    vi.spyOn(Date, 'now').mockReturnValue(1234567890)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.login()
    })

    expect(result.current.token).toBe('mock_token_1234567890')
    expect(result.current.isAuthenticated).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'mock_token_1234567890')
  })

  it('logout clears token and updates state', async () => {
    localStorageMock.getItem.mockReturnValue('existing_token')

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.logout()
    })

    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
  })

  it('returns login function', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(typeof result.current.login).toBe('function')
  })

  it('returns logout function', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(typeof result.current.logout).toBe('function')
  })

  it('login then logout cycle works correctly', async () => {
    localStorageMock.getItem.mockReturnValue(null)
    vi.spyOn(Date, 'now').mockReturnValue(9999999999)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Initially not authenticated
    expect(result.current.isAuthenticated).toBe(false)

    // Login
    await act(async () => {
      await result.current.login()
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.token).toBe('mock_token_9999999999')

    // Logout
    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.token).toBeNull()
  })
})
