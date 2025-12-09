/**
 * Mock for cloudflare:workers module used in tests
 */

// Mock DurableObject base class
export class DurableObject {
  state: any
  env: any

  constructor(state: any, env: any) {
    this.state = state
    this.env = env
  }

  fetch(request: Request): Response | Promise<Response> {
    return new Response('Mock response')
  }
}

export const env = {}
export const ctx = {}
