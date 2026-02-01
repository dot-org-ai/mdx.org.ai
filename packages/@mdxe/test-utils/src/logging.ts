/**
 * @mdxe/test-utils/logging - Unified logging abstraction
 *
 * Provides a consistent logging interface with log levels, structured output,
 * and child logger support.
 *
 * @example
 * ```ts
 * import { createLogger } from '@mdxe/test-utils/logging'
 *
 * const log = createLogger({ level: 'info', prefix: '[mdxe]' })
 * log.info('Starting deployment', { platform: 'cloudflare', name: 'my-worker' })
 * log.error('Deployment failed', error, { attemptNumber: 3 })
 *
 * // Create child logger with persistent context
 * const requestLog = log.child({ requestId: '123' })
 * requestLog.info('Handling request', { path: '/api' })
 * ```
 */

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Arbitrary context data to attach to log entries
 */
export interface LogContext {
  [key: string]: unknown
}

/**
 * Logger interface with level-based logging methods
 */
export interface Logger {
  /**
   * Log a debug message (lowest severity)
   */
  debug(message: string, context?: LogContext): void

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void

  /**
   * Log an error message (highest severity)
   */
  error(message: string, error?: Error, context?: LogContext): void

  /**
   * Create a child logger with merged context
   */
  child(context: LogContext): Logger
}

/**
 * Options for creating a logger
 */
export interface LoggerOptions {
  /**
   * Minimum log level to output (default: 'info')
   */
  level?: LogLevel

  /**
   * Output structured JSON format (default: false)
   */
  structured?: boolean

  /**
   * Prefix to prepend to all log messages
   */
  prefix?: string
}

/**
 * Log level priority values (higher = more severe)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Internal logger state
 */
interface LoggerState {
  level: LogLevel
  structured: boolean
  prefix?: string
  context: LogContext
}

/**
 * Format an error for structured output
 */
function formatError(error: Error): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  }
}

/**
 * Create a logger implementation with the given state
 */
function createLoggerImpl(state: LoggerState): Logger {
  const { level, structured, prefix, context } = state

  function shouldLog(msgLevel: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[msgLevel] >= LOG_LEVEL_PRIORITY[level]
  }

  function formatMessage(message: string): string {
    return prefix ? `${prefix} ${message}` : message
  }

  function logStructured(
    msgLevel: LogLevel,
    message: string,
    error?: Error,
    msgContext?: LogContext
  ): void {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level: msgLevel,
      message,
      ...context,
      ...msgContext,
    }

    if (prefix) {
      entry.prefix = prefix
    }

    if (error) {
      entry.error = formatError(error)
    }

    const consoleMethod = msgLevel === 'debug' ? 'debug' : msgLevel === 'info' ? 'info' : msgLevel === 'warn' ? 'warn' : 'error'
    console[consoleMethod](JSON.stringify(entry))
  }

  function logPlain(
    msgLevel: LogLevel,
    message: string,
    error?: Error,
    msgContext?: LogContext
  ): void {
    const consoleMethod = msgLevel === 'debug' ? 'debug' : msgLevel === 'info' ? 'info' : msgLevel === 'warn' ? 'warn' : 'error'
    const formattedMessage = formatMessage(message)

    // Merge parent context with message context
    const mergedContext = { ...context, ...msgContext }
    const hasContext = Object.keys(mergedContext).length > 0

    if (msgLevel === 'error' && error) {
      if (hasContext) {
        console[consoleMethod](formattedMessage, error, mergedContext)
      } else {
        console[consoleMethod](formattedMessage, error)
      }
    } else if (hasContext) {
      console[consoleMethod](formattedMessage, mergedContext)
    } else {
      console[consoleMethod](formattedMessage)
    }
  }

  return {
    debug(message: string, msgContext?: LogContext): void {
      if (!shouldLog('debug')) return
      if (structured) {
        logStructured('debug', message, undefined, msgContext)
      } else {
        logPlain('debug', message, undefined, msgContext)
      }
    },

    info(message: string, msgContext?: LogContext): void {
      if (!shouldLog('info')) return
      if (structured) {
        logStructured('info', message, undefined, msgContext)
      } else {
        logPlain('info', message, undefined, msgContext)
      }
    },

    warn(message: string, msgContext?: LogContext): void {
      if (!shouldLog('warn')) return
      if (structured) {
        logStructured('warn', message, undefined, msgContext)
      } else {
        logPlain('warn', message, undefined, msgContext)
      }
    },

    error(message: string, error?: Error, msgContext?: LogContext): void {
      if (!shouldLog('error')) return
      if (structured) {
        logStructured('error', message, error, msgContext)
      } else {
        logPlain('error', message, error, msgContext)
      }
    },

    child(childContext: LogContext): Logger {
      return createLoggerImpl({
        ...state,
        context: { ...context, ...childContext },
      })
    },
  }
}

/**
 * Create a new logger instance
 *
 * @param options - Logger configuration options
 * @returns A Logger instance
 *
 * @example
 * ```ts
 * // Basic usage
 * const log = createLogger()
 * log.info('Hello world')
 *
 * // With options
 * const log = createLogger({
 *   level: 'debug',
 *   prefix: '[myapp]',
 *   structured: true
 * })
 *
 * // With context
 * log.info('User logged in', { userId: '123', ip: '1.2.3.4' })
 *
 * // Child logger
 * const requestLog = log.child({ requestId: 'abc123' })
 * requestLog.info('Processing request') // includes requestId in all logs
 * ```
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const state: LoggerState = {
    level: options.level ?? 'info',
    structured: options.structured ?? false,
    prefix: options.prefix,
    context: {},
  }

  return createLoggerImpl(state)
}
