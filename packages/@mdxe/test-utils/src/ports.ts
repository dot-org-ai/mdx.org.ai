/**
 * Port Management Utilities for Testing
 *
 * Provides utilities for managing ports in tests to avoid conflicts.
 */

/**
 * Track used ports to avoid conflicts
 */
const usedPorts = new Set<number>()

/**
 * Default port range for testing
 */
const DEFAULT_MIN_PORT = 10000
const DEFAULT_MAX_PORT = 65535

/**
 * Options for port allocation
 */
export interface PortAllocationOptions {
  /** Minimum port number (default: 10000) */
  minPort?: number
  /** Maximum port number (default: 65535) */
  maxPort?: number
  /** Number of ports to reserve */
  count?: number
}

/**
 * Check if a port is available (not in use by our tracker)
 */
export function isPortAvailable(port: number): boolean {
  return !usedPorts.has(port)
}

/**
 * Get a random available port in the specified range
 */
export function getRandomPort(options: PortAllocationOptions = {}): number {
  const minPort = options.minPort ?? DEFAULT_MIN_PORT
  const maxPort = options.maxPort ?? DEFAULT_MAX_PORT

  // Try to find an available port
  const maxAttempts = 100
  for (let i = 0; i < maxAttempts; i++) {
    const port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort
    if (!usedPorts.has(port)) {
      usedPorts.add(port)
      return port
    }
  }

  throw new Error(`Could not find available port in range ${minPort}-${maxPort}`)
}

/**
 * Reserve a specific port
 */
export function reservePort(port: number): boolean {
  if (usedPorts.has(port)) {
    return false
  }
  usedPorts.add(port)
  return true
}

/**
 * Release a port back to the pool
 */
export function releasePort(port: number): void {
  usedPorts.delete(port)
}

/**
 * Get multiple random available ports
 */
export function getRandomPorts(count: number, options: PortAllocationOptions = {}): number[] {
  const ports: number[] = []
  for (let i = 0; i < count; i++) {
    ports.push(getRandomPort(options))
  }
  return ports
}

/**
 * Release all reserved ports
 */
export function releaseAllPorts(): void {
  usedPorts.clear()
}

/**
 * Get count of currently reserved ports
 */
export function getReservedPortCount(): number {
  return usedPorts.size
}

/**
 * Get all currently reserved ports
 */
export function getReservedPorts(): number[] {
  return Array.from(usedPorts)
}

/**
 * Port range helper for allocating contiguous ports
 */
export class PortRange {
  private startPort: number
  private endPort: number
  private nextPort: number

  constructor(start: number, count: number) {
    this.startPort = start
    this.endPort = start + count - 1
    this.nextPort = start

    // Reserve the range
    for (let port = start; port <= this.endPort; port++) {
      usedPorts.add(port)
    }
  }

  /**
   * Get the next port in the range
   */
  next(): number {
    if (this.nextPort > this.endPort) {
      throw new Error('Port range exhausted')
    }
    return this.nextPort++
  }

  /**
   * Check if there are more ports available
   */
  hasNext(): boolean {
    return this.nextPort <= this.endPort
  }

  /**
   * Reset to start of range
   */
  reset(): void {
    this.nextPort = this.startPort
  }

  /**
   * Release all ports in the range
   */
  release(): void {
    for (let port = this.startPort; port <= this.endPort; port++) {
      usedPorts.delete(port)
    }
  }

  /**
   * Get the start port
   */
  get start(): number {
    return this.startPort
  }

  /**
   * Get the end port
   */
  get end(): number {
    return this.endPort
  }
}

/**
 * Create a port range starting from a random available port
 */
export function createPortRange(count: number, options: PortAllocationOptions = {}): PortRange {
  const minPort = options.minPort ?? DEFAULT_MIN_PORT
  const maxPort = options.maxPort ?? DEFAULT_MAX_PORT

  // Find a starting point where we can allocate 'count' contiguous ports
  const maxAttempts = 100
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const start = Math.floor(Math.random() * (maxPort - minPort - count + 1)) + minPort

    // Check if all ports in range are available
    let allAvailable = true
    for (let port = start; port < start + count; port++) {
      if (usedPorts.has(port)) {
        allAvailable = false
        break
      }
    }

    if (allAvailable) {
      return new PortRange(start, count)
    }
  }

  throw new Error(`Could not find ${count} contiguous available ports`)
}

/**
 * Wait for a port to become available (for cleanup in tests)
 */
export async function waitForPortRelease(
  port: number,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now()
  while (usedPorts.has(port)) {
    if (Date.now() - start > timeout) {
      throw new Error(`Timeout waiting for port ${port} to be released`)
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}
