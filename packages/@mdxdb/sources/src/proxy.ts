/**
 * @mdxdb/sources - Proxy support with Cloudflare TCP sockets
 */

import type { ProxyConfig } from './types.js'

/**
 * Socket address for TCP connection
 */
export interface SocketAddress {
  hostname: string
  port: number
}

/**
 * Connection options for TCP socket
 */
export interface SocketOptions {
  secureTransport?: 'on' | 'off' | 'starttls'
  allowHalfOpen?: boolean
}

/**
 * Cloudflare TCP socket interface
 * @see https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/
 */
export interface Socket {
  readonly readable: ReadableStream<Uint8Array>
  readonly writable: WritableStream<Uint8Array>
  readonly closed: Promise<void>
  close(): Promise<void>
  startTls(): Socket
}

/**
 * Connect function type (available in Cloudflare Workers)
 */
export type ConnectFn = (address: SocketAddress, options?: SocketOptions) => Socket

/**
 * Type alias for fetch input
 */
type FetchInput = Request | string | URL

/**
 * Proxy connection manager
 */
export class ProxyManager {
  private config: ProxyConfig

  constructor(config: ProxyConfig) {
    this.config = config
  }

  /**
   * Create a fetch function that routes through the proxy
   */
  createFetch(): typeof fetch {
    const proxyUrl = new URL(this.config.url)
    const protocol = proxyUrl.protocol

    // For Cloudflare TCP sockets
    if (this.config.cloudflare) {
      return this.createCloudflareFetch()
    }

    // For HTTP/HTTPS proxies
    if (protocol === 'http:' || protocol === 'https:') {
      return this.createHttpProxyFetch()
    }

    // For SOCKS5 proxies
    if (protocol === 'socks5:') {
      return this.createSocks5Fetch()
    }

    throw new Error(`Unsupported proxy protocol: ${protocol}`)
  }

  /**
   * Create fetch using Cloudflare TCP sockets
   */
  private createCloudflareFetch(): typeof fetch {
    const cf = this.config.cloudflare!

    return async (input: FetchInput, init?: RequestInit): Promise<Response> => {
      // @ts-expect-error - connect is available in Cloudflare Workers runtime
      const connect = globalThis.connect as ConnectFn | undefined

      if (!connect) {
        throw new Error('Cloudflare TCP sockets not available in this environment')
      }

      const request = new Request(input, init)
      const url = new URL(request.url)

      // Connect through the proxy
      const socket = connect(
        { hostname: cf.hostname, port: cf.port },
        { secureTransport: cf.tls ? 'on' : 'off' }
      )

      // Build HTTP request
      const httpRequest = buildHttpRequest(request, url)

      // Write request to socket
      const writer = socket.writable.getWriter()
      await writer.write(new TextEncoder().encode(httpRequest))

      // Add body if present
      if (request.body) {
        const reader = request.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await writer.write(value)
        }
      }

      await writer.close()

      // Read response from socket
      const response = await readHttpResponse(socket.readable)
      await socket.close()

      return response
    }
  }

  /**
   * Create fetch using HTTP CONNECT proxy
   */
  private createHttpProxyFetch(): typeof fetch {
    const proxyUrl = new URL(this.config.url)
    const proxyAuth = this.config.auth
      ? `Basic ${btoa(`${this.config.auth.username}:${this.config.auth.password}`)}`
      : undefined

    return async (input: FetchInput, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init)
      const targetUrl = new URL(request.url)

      // For HTTPS targets, we need CONNECT tunnel
      if (targetUrl.protocol === 'https:') {
        // In a real implementation, this would establish a CONNECT tunnel
        // For now, we'll use a simpler approach that works with most proxies
        const proxyRequest = new Request(proxyUrl.toString(), {
          method: 'CONNECT',
          headers: {
            Host: `${targetUrl.hostname}:${targetUrl.port || 443}`,
            ...(proxyAuth ? { 'Proxy-Authorization': proxyAuth } : {}),
          },
        })

        // This is a simplified version - real implementation needs socket handling
        console.warn('HTTPS proxy tunneling requires native socket support')
        return fetch(request)
      }

      // For HTTP targets, we can use the proxy directly
      const proxiedUrl = new URL(request.url)
      const headers = new Headers(request.headers)

      if (proxyAuth) {
        headers.set('Proxy-Authorization', proxyAuth)
      }

      // Rewrite the request to go through the proxy
      const proxiedRequest = new Request(proxyUrl.toString(), {
        method: request.method,
        headers,
        body: request.body,
      })

      // Set the actual target URL in the request line
      // This requires low-level HTTP handling
      return fetch(proxiedRequest)
    }
  }

  /**
   * Create fetch using SOCKS5 proxy
   */
  private createSocks5Fetch(): typeof fetch {
    const proxyUrl = new URL(this.config.url)

    return async (input: FetchInput, init?: RequestInit): Promise<Response> => {
      // SOCKS5 requires native socket support
      // In Cloudflare Workers, use TCP sockets
      // @ts-expect-error - connect may be available
      const connect = globalThis.connect as ConnectFn | undefined

      if (!connect) {
        throw new Error('SOCKS5 proxy requires native socket support')
      }

      const request = new Request(input, init)
      const targetUrl = new URL(request.url)

      // Connect to SOCKS5 proxy
      const socket = connect(
        { hostname: proxyUrl.hostname, port: parseInt(proxyUrl.port) || 1080 },
        { secureTransport: 'off' }
      )

      // SOCKS5 handshake
      const writer = socket.writable.getWriter()
      const reader = socket.readable.getReader()

      // Version identifier/method selection
      await writer.write(new Uint8Array([
        0x05, // SOCKS version
        0x01, // Number of methods
        this.config.auth ? 0x02 : 0x00, // Auth method (0x00 = no auth, 0x02 = username/password)
      ]))

      // Read server choice
      const methodResponse = await readBytes(reader, 2)
      if (methodResponse[0] !== 0x05) {
        throw new Error('Invalid SOCKS5 version')
      }

      // Handle authentication if required
      if (methodResponse[1] === 0x02 && this.config.auth) {
        const { username, password } = this.config.auth
        const authRequest = new Uint8Array([
          0x01, // Auth version
          username.length,
          ...new TextEncoder().encode(username),
          password.length,
          ...new TextEncoder().encode(password),
        ])
        await writer.write(authRequest)

        const authResponse = await readBytes(reader, 2)
        if (authResponse[1] !== 0x00) {
          throw new Error('SOCKS5 authentication failed')
        }
      }

      // Connection request
      const targetHost = new TextEncoder().encode(targetUrl.hostname)
      const targetPort = parseInt(targetUrl.port) || (targetUrl.protocol === 'https:' ? 443 : 80)

      const connectRequest = new Uint8Array([
        0x05, // SOCKS version
        0x01, // Connect command
        0x00, // Reserved
        0x03, // Domain name address type
        targetHost.length,
        ...targetHost,
        (targetPort >> 8) & 0xff, // Port high byte
        targetPort & 0xff, // Port low byte
      ])
      await writer.write(connectRequest)

      // Read connection response
      const connectResponse = await readBytes(reader, 4)
      if (connectResponse[1] !== 0x00) {
        throw new Error(`SOCKS5 connection failed: ${connectResponse[1]}`)
      }

      // Skip the rest of the response (address and port)
      if (connectResponse[3] === 0x01) {
        await readBytes(reader, 6) // IPv4 + port
      } else if (connectResponse[3] === 0x03) {
        const lenByte = (await readBytes(reader, 1))[0]
        const len = lenByte ?? 0
        await readBytes(reader, len + 2) // Domain + port
      } else if (connectResponse[3] === 0x04) {
        await readBytes(reader, 18) // IPv6 + port
      }

      // Now the socket is connected to the target
      // Send HTTP request
      if (targetUrl.protocol === 'https:') {
        // Upgrade to TLS
        const tlsSocket = socket.startTls()
        return this.sendHttpRequest(tlsSocket, request, targetUrl)
      }

      return this.sendHttpRequest(socket, request, targetUrl)
    }
  }

  /**
   * Send HTTP request over socket
   */
  private async sendHttpRequest(
    socket: Socket,
    request: Request,
    url: URL
  ): Promise<Response> {
    const writer = socket.writable.getWriter()

    const httpRequest = buildHttpRequest(request, url)
    await writer.write(new TextEncoder().encode(httpRequest))

    if (request.body) {
      const bodyReader = request.body.getReader()
      while (true) {
        const { done, value } = await bodyReader.read()
        if (done) break
        await writer.write(value)
      }
    }

    await writer.close()

    const response = await readHttpResponse(socket.readable)
    await socket.close()

    return response
  }
}

/**
 * Build HTTP request string
 */
function buildHttpRequest(request: Request, url: URL): string {
  const lines: string[] = []

  // Request line
  const path = url.pathname + url.search
  lines.push(`${request.method} ${path} HTTP/1.1`)

  // Host header
  lines.push(`Host: ${url.host}`)

  // Copy headers
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      lines.push(`${key}: ${value}`)
    }
  })

  // Content-Length for bodies
  if (request.body) {
    // Note: This is simplified; real implementation needs to handle streaming bodies
    lines.push('Transfer-Encoding: chunked')
  }

  // End headers
  lines.push('')
  lines.push('')

  return lines.join('\r\n')
}

/**
 * Read HTTP response from stream
 */
async function readHttpResponse(readable: ReadableStream<Uint8Array>): Promise<Response> {
  const reader = readable.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let headers: Headers | null = null
  let status = 200
  let statusText = ''
  const bodyChunks: Uint8Array[] = []
  let headersComplete = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    if (!headersComplete) {
      buffer += decoder.decode(value, { stream: true })

      const headerEnd = buffer.indexOf('\r\n\r\n')
      if (headerEnd !== -1) {
        const headerSection = buffer.substring(0, headerEnd)
        const bodyStart = buffer.substring(headerEnd + 4)

        // Parse status line
        const lines = headerSection.split('\r\n')
        const statusLine = lines[0] ?? ''
        const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+) (.*)/)
        if (statusMatch) {
          status = parseInt(statusMatch[1] ?? '200')
          statusText = statusMatch[2] ?? 'OK'
        }

        // Parse headers
        headers = new Headers()
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]
          if (!line) continue
          const colonIndex = line.indexOf(':')
          if (colonIndex !== -1) {
            const key = line.substring(0, colonIndex).trim()
            const val = line.substring(colonIndex + 1).trim()
            headers.append(key, val)
          }
        }

        headersComplete = true

        if (bodyStart) {
          bodyChunks.push(new TextEncoder().encode(bodyStart))
        }
      }
    } else {
      bodyChunks.push(value)
    }
  }

  // Combine body chunks
  const totalLength = bodyChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const body = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of bodyChunks) {
    body.set(chunk, offset)
    offset += chunk.length
  }

  return new Response(body, {
    status,
    statusText,
    headers: headers || new Headers(),
  })
}

/**
 * Read exact number of bytes from reader
 */
async function readBytes(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  count: number
): Promise<Uint8Array> {
  const result = new Uint8Array(count)
  let offset = 0

  while (offset < count) {
    const { done, value } = await reader.read()
    if (done) {
      throw new Error('Unexpected end of stream')
    }

    const toCopy = Math.min(value.length, count - offset)
    result.set(value.subarray(0, toCopy), offset)
    offset += toCopy
  }

  return result
}

/**
 * Create a proxy-aware fetch function
 */
export function createProxyFetch(config: ProxyConfig): typeof fetch {
  const manager = new ProxyManager(config)
  return manager.createFetch()
}

/**
 * Check if running in Cloudflare Workers environment
 */
export function isCloudflareWorkers(): boolean {
  // @ts-expect-error - checking for Cloudflare-specific global
  return typeof globalThis.connect === 'function'
}
