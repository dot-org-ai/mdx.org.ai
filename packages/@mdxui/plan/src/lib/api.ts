import type { SessionState } from './client'

/**
 * REST API helpers for agent session service
 */

export class ApiClient {
  constructor(private baseUrl: string = 'https://agents.do') {}

  async getSessions(): Promise<SessionState[]> {
    const response = await fetch(`${this.baseUrl}/sessions`)
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`)
    }
    return response.json()
  }

  async getSession(sessionId: string): Promise<SessionState> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/state`)
    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`)
    }
    return response.json()
  }

  async createSession(config: {
    prompt: string
    model?: string
    cwd?: string
  }): Promise<{ sessionId: string }> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`)
    }

    return response.json()
  }

  async getSessionMDX(sessionId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/mdx`)
    if (!response.ok) {
      throw new Error(`Failed to fetch session MDX: ${response.statusText}`)
    }
    return response.text()
  }

  async getSessionMarkdown(sessionId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/markdown`)
    if (!response.ok) {
      throw new Error(`Failed to fetch session markdown: ${response.statusText}`)
    }
    return response.text()
  }
}

export const apiClient = new ApiClient()
