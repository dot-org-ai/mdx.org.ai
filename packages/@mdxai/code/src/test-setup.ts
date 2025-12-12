import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Store WebSocket instances for testing
export const wsInstances: MockWebSocket[] = []

// Mock WebSocket for tests
export class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    wsInstances.push(this)
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send(_data: string): void {
    // Mock send
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }
}

// Create a spy wrapper
const WebSocketSpy = vi.fn().mockImplementation((url: string) => new MockWebSocket(url))

// @ts-expect-error - Mocking global WebSocket
globalThis.WebSocket = WebSocketSpy

// Mock fetch for API tests
globalThis.fetch = vi.fn()

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
  wsInstances.length = 0
})
