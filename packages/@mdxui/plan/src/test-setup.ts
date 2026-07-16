import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Store WebSocket instances for testing
export const wsInstances: MockWebSocket[] = []

// Mock WebSocket
export class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  private messageQueue: unknown[] = []
  private sentMessages: unknown[] = []

  constructor(public url: string) {
    wsInstances.push(this)
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
      // Flush any queued messages
      this.messageQueue.forEach((data) => {
        this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
      })
      this.messageQueue = []
    }, 0)
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (typeof data === 'string') {
      this.sentMessages.push(JSON.parse(data))
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Helper to simulate receiving a message
  simulateMessage(data: unknown): void {
    if (this.readyState === MockWebSocket.OPEN) {
      this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
    } else {
      // Queue for when connection opens
      this.messageQueue.push(data)
    }
  }

  // Helper to simulate an error
  simulateError(error?: Error): void {
    this.onerror?.(new ErrorEvent('error', { error }))
  }

  // Test helper to get sent messages
  getSentMessages(): unknown[] {
    return this.sentMessages
  }

  // Test helper to clear sent messages
  clearSentMessages(): void {
    this.sentMessages = []
  }
}

Object.defineProperty(window, 'WebSocket', { value: MockWebSocket })

// Mock fetch
export const mockFetch = vi.fn()
Object.defineProperty(window, 'fetch', { value: mockFetch, writable: true })

/**
 * Create a mock Response for fetch
 */
export function createMockResponse(
  body: unknown,
  options: { status?: number; ok?: boolean; headers?: Record<string, string> } = {}
): Response {
  const { status = 200, ok = true, headers = {} } = options
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
    clone: vi.fn().mockReturnThis(),
  } as unknown as Response
}

/**
 * Helper to wait for all pending promises
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Helper to wait for a specific number of milliseconds
 */
export async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get the last created WebSocket instance
 */
export function getLastWebSocket(): MockWebSocket | undefined {
  return wsInstances[wsInstances.length - 1]
}

/**
 * Get all WebSocket instances
 */
export function getAllWebSockets(): MockWebSocket[] {
  return [...wsInstances]
}

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
  wsInstances.length = 0
  mockFetch.mockReset()
})
