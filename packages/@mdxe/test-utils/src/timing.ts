/**
 * Timing Utilities for Testing
 *
 * Provides utilities for managing timing in tests, including retries,
 * delays, and timeout management.
 */

/**
 * Options for retry operations
 */
export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number
  /** Initial delay between attempts in ms (default: 100) */
  initialDelay?: number
  /** Maximum delay between attempts in ms (default: 5000) */
  maxDelay?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff?: boolean
  /** Custom condition to determine if retry should continue */
  shouldRetry?: (error: Error, attempt: number) => boolean
  /** Callback called before each retry */
  onRetry?: (error: Error, attempt: number, delay: number) => void
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean
  /** The result value if successful */
  value?: T
  /** The last error if failed */
  error?: Error
  /** Number of attempts made */
  attempts: number
  /** Total time spent in ms */
  totalTime: number
}

/**
 * Retry an async operation with configurable backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoffMultiplier = 2,
    exponentialBackoff = true,
    shouldRetry = () => true,
    onRetry,
  } = options

  const startTime = Date.now()
  let lastError: Error | undefined
  let delay = initialDelay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await operation()
      return {
        success: true,
        value,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // Check if we should retry
      if (attempt >= maxAttempts || !shouldRetry(lastError, attempt)) {
        break
      }

      // Notify retry callback
      if (onRetry) {
        onRetry(lastError, attempt, delay)
      }

      // Wait before retrying
      await sleep(delay)

      // Calculate next delay
      if (exponentialBackoff) {
        delay = Math.min(delay * backoffMultiplier, maxDelay)
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalTime: Date.now() - startTime,
  }
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait until a condition is true
 */
export async function waitUntil(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number
    interval?: number
    timeoutMessage?: string
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, timeoutMessage = 'Condition timed out' } = options

  const start = Date.now()
  while (!(await condition())) {
    if (Date.now() - start > timeout) {
      throw new Error(timeoutMessage)
    }
    await sleep(interval)
  }
}

/**
 * Wait for an async operation to complete or timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeout: number,
  timeoutMessage?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage ?? `Operation timed out after ${timeout}ms`))
    }, timeout)
  })

  try {
    const result = await Promise.race([operation, timeoutPromise])
    return result
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Debounce a function for testing
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Throttle a function for testing
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      fn(...args)
    }
  }
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

/**
 * Measure execution time of an operation
 */
export async function measureTime<T>(
  operation: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await operation()
  const duration = performance.now() - start
  return { result, duration }
}

/**
 * Run operations in sequence with delays
 */
export async function runSequence<T>(
  operations: Array<() => T | Promise<T>>,
  delayBetween: number = 0
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < operations.length; i++) {
    if (i > 0 && delayBetween > 0) {
      await sleep(delayBetween)
    }
    const op = operations[i]
    if (op) {
      results.push(await op())
    }
  }
  return results
}

/**
 * Run an operation periodically until cancelled
 */
export function runPeriodically(
  operation: () => void | Promise<void>,
  interval: number
): { stop: () => void } {
  let running = true
  let timeoutId: NodeJS.Timeout | undefined

  const run = async () => {
    while (running) {
      await operation()
      if (running) {
        await new Promise<void>((resolve) => {
          timeoutId = setTimeout(resolve, interval)
        })
      }
    }
  }

  run().catch(() => {}) // Start the loop

  return {
    stop: () => {
      running = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    },
  }
}

/**
 * Fake timers helper for testing
 */
export class FakeTimers {
  private callbacks: Array<{ callback: () => void; time: number }> = []
  private currentTime = 0

  /**
   * Schedule a callback to run after a delay
   */
  setTimeout(callback: () => void, delay: number): number {
    const id = this.callbacks.length
    this.callbacks.push({ callback, time: this.currentTime + delay })
    return id
  }

  /**
   * Advance time by the specified amount
   */
  tick(ms: number): void {
    const targetTime = this.currentTime + ms
    while (true) {
      const pending = this.callbacks
        .filter((cb) => cb.time <= targetTime)
        .sort((a, b) => a.time - b.time)

      if (pending.length === 0) {
        this.currentTime = targetTime
        break
      }

      const next = pending[0]
      if (!next) break
      this.currentTime = next.time
      this.callbacks = this.callbacks.filter((cb) => cb !== next)
      next.callback()
    }
  }

  /**
   * Get current fake time
   */
  now(): number {
    return this.currentTime
  }

  /**
   * Reset all timers
   */
  reset(): void {
    this.callbacks = []
    this.currentTime = 0
  }
}
