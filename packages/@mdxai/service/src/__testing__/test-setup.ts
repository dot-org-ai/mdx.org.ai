/**
 * Integration test setup
 *
 * Sets up mocks and utilities for integration testing across packages.
 */

import { vi, beforeEach } from 'vitest'

// Polyfill CloseEvent for Node.js
class CloseEventPolyfill extends Event {
  code: number
  reason: string
  wasClean: boolean
  constructor(type: string, eventInitDict?: CloseEventInit) {
    super(type, eventInitDict)
    this.code = eventInitDict?.code ?? 1000
    this.reason = eventInitDict?.reason ?? ''
    this.wasClean = eventInitDict?.wasClean ?? true
  }
}
// @ts-expect-error - Polyfill for Node.js
globalThis.CloseEvent = globalThis.CloseEvent || CloseEventPolyfill

// Polyfill ErrorEvent for Node.js
class ErrorEventPolyfill extends Event {
  error?: Error
  message: string
  filename: string
  lineno: number
  colno: number
  constructor(type: string, eventInitDict?: ErrorEventInit) {
    super(type, eventInitDict)
    this.error = eventInitDict?.error
    this.message = eventInitDict?.message ?? ''
    this.filename = eventInitDict?.filename ?? ''
    this.lineno = eventInitDict?.lineno ?? 0
    this.colno = eventInitDict?.colno ?? 0
  }
}
// @ts-expect-error - Polyfill for Node.js
globalThis.ErrorEvent = globalThis.ErrorEvent || ErrorEventPolyfill

// Store WebSocket instances for testing
export const wsInstances: MockWebSocket[] = []

/**
 * Mock WebSocket implementation for testing
 */
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

  private messageQueue: unknown[] = []
  private sentMessages: unknown[] = []

  constructor(url: string) {
    this.url = url
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

  send(data: string): void {
    this.sentMessages.push(JSON.parse(data))
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: unknown): void {
    if (this.readyState === MockWebSocket.OPEN) {
      this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
    } else {
      // Queue for when connection opens
      this.messageQueue.push(data)
    }
  }

  // Test helper to simulate error
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

/**
 * Mock fetch for API and service tests
 */
export const mockFetch = vi.fn()

/**
 * Mock DurableObjectState for SessionDO testing
 */
export interface MockStorage {
  data: Map<string, unknown>
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
}

export function createMockStorage(): MockStorage {
  const data = new Map<string, unknown>()
  return {
    data,
    get: vi.fn(async <T>(key: string): Promise<T | undefined> => data.get(key) as T | undefined),
    put: vi.fn(async (key: string, value: unknown) => {
      data.set(key, value)
    }),
    delete: vi.fn(async (key: string) => {
      data.delete(key)
    }),
    list: vi.fn(async () => data),
  }
}

export interface MockDurableObjectState {
  id: { toString: () => string }
  storage: MockStorage
  blockConcurrencyWhile: ReturnType<typeof vi.fn>
  acceptWebSocket: ReturnType<typeof vi.fn>
  waitUntil: ReturnType<typeof vi.fn>
  getWebSockets: ReturnType<typeof vi.fn>
}

export function createMockDOState(sessionId: string = 'test-session-123'): MockDurableObjectState {
  const webSockets: WebSocket[] = []
  return {
    id: { toString: () => sessionId },
    storage: createMockStorage(),
    blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),
    acceptWebSocket: vi.fn((ws: WebSocket) => webSockets.push(ws)),
    waitUntil: vi.fn(),
    getWebSockets: vi.fn(() => webSockets),
  }
}

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

/**
 * Initialize mocks - call this in your test file setup
 */
export function initializeMocks(): void {
  // Create a spy wrapper
  const WebSocketSpy = vi.fn().mockImplementation((url: string) => new MockWebSocket(url))
  // @ts-expect-error - Mocking global WebSocket
  globalThis.WebSocket = WebSocketSpy
  globalThis.fetch = mockFetch
}

/**
 * Reset mocks - call this in beforeEach
 */
export function resetMocks(): void {
  vi.clearAllMocks()
  wsInstances.length = 0
  mockFetch.mockReset()
}

// Export for convenience in test setup files
export { vi, beforeEach }
