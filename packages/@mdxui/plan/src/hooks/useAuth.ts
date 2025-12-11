import { useState, useEffect } from 'react'

/**
 * Hook for oauth.do authentication
 * Placeholder implementation - to be integrated with actual oauth.do
 */
export function useAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken) {
      setToken(storedToken)
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const login = async () => {
    // TODO: Integrate with oauth.do
    // For now, mock implementation
    const mockToken = 'mock_token_' + Date.now()
    localStorage.setItem('auth_token', mockToken)
    setToken(mockToken)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setIsAuthenticated(false)
  }

  return {
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }
}
