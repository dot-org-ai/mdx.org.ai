import type { SessionResponse, SessionConfig, SessionState } from '../types.js'

export interface ApiClientOptions {
  baseUrl?: string
  authToken: string
}

/**
 * REST API client for session service
 */
export class ApiClient {
  private baseUrl: string
  private authToken: string

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl ?? 'https://agents.do'
    this.authToken = options.authToken
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.authToken}`,
    }
  }

  /**
   * Create a new session
   */
  async createSession(config: Omit<SessionConfig, 'sessionId'>): Promise<SessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get session state
   */
  async getSession(sessionId: string): Promise<SessionState> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/state`, {
      headers: this.headers,
    })

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<SessionState[]> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      headers: this.headers,
    })

    if (!response.ok) {
      throw new Error(`Failed to list sessions: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get session as MDX
   */
  async getSessionMDX(sessionId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/mdx`, {
      headers: this.headers,
    })

    if (!response.ok) {
      throw new Error(`Failed to get session MDX: ${response.statusText}`)
    }

    return response.text()
  }

  /**
   * Get session as Markdown (GitHub-flavored)
   */
  async getSessionMarkdown(sessionId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/markdown`, {
      headers: this.headers,
    })

    if (!response.ok) {
      throw new Error(`Failed to get session markdown: ${response.statusText}`)
    }

    return response.text()
  }
}
