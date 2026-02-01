import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, LogLevel, Logger, LogContext } from '../src/logging'

describe('createLogger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('basic logging', () => {
    it('should log debug messages', () => {
      const log = createLogger({ level: 'debug' })
      log.debug('test message')
      expect(consoleSpy.debug).toHaveBeenCalledWith('test message')
    })

    it('should log info messages', () => {
      const log = createLogger({ level: 'info' })
      log.info('test message')
      expect(consoleSpy.info).toHaveBeenCalledWith('test message')
    })

    it('should log warn messages', () => {
      const log = createLogger({ level: 'warn' })
      log.warn('test message')
      expect(consoleSpy.warn).toHaveBeenCalledWith('test message')
    })

    it('should log error messages', () => {
      const log = createLogger({ level: 'error' })
      log.error('test message')
      expect(consoleSpy.error).toHaveBeenCalledWith('test message')
    })

    it('should log error messages with Error object', () => {
      const log = createLogger({ level: 'error' })
      const error = new Error('something went wrong')
      log.error('test message', error)
      expect(consoleSpy.error).toHaveBeenCalledWith('test message', error)
    })
  })

  describe('log level filtering', () => {
    it('should filter debug messages when level is info', () => {
      const log = createLogger({ level: 'info' })
      log.debug('debug message')
      log.info('info message')
      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).toHaveBeenCalledWith('info message')
    })

    it('should filter debug and info messages when level is warn', () => {
      const log = createLogger({ level: 'warn' })
      log.debug('debug message')
      log.info('info message')
      log.warn('warn message')
      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalledWith('warn message')
    })

    it('should filter all except error when level is error', () => {
      const log = createLogger({ level: 'error' })
      log.debug('debug message')
      log.info('info message')
      log.warn('warn message')
      log.error('error message')
      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalledWith('error message')
    })

    it('should default to info level', () => {
      const log = createLogger()
      log.debug('debug message')
      log.info('info message')
      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).toHaveBeenCalledWith('info message')
    })
  })

  describe('prefix support', () => {
    it('should prepend prefix to messages', () => {
      const log = createLogger({ level: 'info', prefix: '[mdxe]' })
      log.info('test message')
      expect(consoleSpy.info).toHaveBeenCalledWith('[mdxe] test message')
    })

    it('should prepend prefix to error messages', () => {
      const log = createLogger({ level: 'error', prefix: '[mdxe]' })
      const error = new Error('oops')
      log.error('test message', error)
      expect(consoleSpy.error).toHaveBeenCalledWith('[mdxe] test message', error)
    })
  })

  describe('context support', () => {
    it('should include context in log output', () => {
      const log = createLogger({ level: 'info' })
      log.info('deploying', { platform: 'cloudflare', name: 'my-worker' })
      expect(consoleSpy.info).toHaveBeenCalledWith('deploying', { platform: 'cloudflare', name: 'my-worker' })
    })

    it('should include context and error in error log', () => {
      const log = createLogger({ level: 'error' })
      const error = new Error('failed')
      log.error('deployment failed', error, { attemptNumber: 3 })
      expect(consoleSpy.error).toHaveBeenCalledWith('deployment failed', error, { attemptNumber: 3 })
    })
  })

  describe('structured output', () => {
    it('should output structured JSON when structured is true', () => {
      const log = createLogger({ level: 'info', structured: true })
      log.info('test message', { key: 'value' })
      expect(consoleSpy.info).toHaveBeenCalled()
      const output = consoleSpy.info.mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed).toMatchObject({
        level: 'info',
        message: 'test message',
        key: 'value',
      })
      expect(parsed.timestamp).toBeDefined()
    })

    it('should include error in structured output', () => {
      const log = createLogger({ level: 'error', structured: true })
      const error = new Error('test error')
      log.error('something failed', error, { operation: 'deploy' })
      const output = consoleSpy.error.mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed).toMatchObject({
        level: 'error',
        message: 'something failed',
        operation: 'deploy',
        error: {
          name: 'Error',
          message: 'test error',
        },
      })
      expect(parsed.error.stack).toBeDefined()
    })

    it('should include prefix in structured output', () => {
      const log = createLogger({ level: 'info', structured: true, prefix: '[mdxe]' })
      log.info('test message')
      const output = consoleSpy.info.mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.prefix).toBe('[mdxe]')
    })
  })

  describe('child logger', () => {
    it('should create child logger with merged context', () => {
      const log = createLogger({ level: 'info' })
      const child = log.child({ requestId: '123' })
      child.info('handling request')
      expect(consoleSpy.info).toHaveBeenCalledWith('handling request', { requestId: '123' })
    })

    it('should merge child context with log context', () => {
      const log = createLogger({ level: 'info' })
      const child = log.child({ requestId: '123' })
      child.info('handling request', { path: '/api' })
      expect(consoleSpy.info).toHaveBeenCalledWith('handling request', { requestId: '123', path: '/api' })
    })

    it('should inherit parent prefix', () => {
      const log = createLogger({ level: 'info', prefix: '[mdxe]' })
      const child = log.child({ requestId: '123' })
      child.info('test')
      expect(consoleSpy.info).toHaveBeenCalledWith('[mdxe] test', { requestId: '123' })
    })

    it('should inherit parent log level', () => {
      const log = createLogger({ level: 'warn' })
      const child = log.child({ requestId: '123' })
      child.debug('debug message')
      child.info('info message')
      child.warn('warn message')
      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalled()
    })

    it('should create nested child loggers', () => {
      const log = createLogger({ level: 'info' })
      const child1 = log.child({ requestId: '123' })
      const child2 = child1.child({ userId: '456' })
      child2.info('user action')
      expect(consoleSpy.info).toHaveBeenCalledWith('user action', { requestId: '123', userId: '456' })
    })

    it('should support structured output in child logger', () => {
      const log = createLogger({ level: 'info', structured: true })
      const child = log.child({ requestId: '123' })
      child.info('test', { extra: 'data' })
      const output = consoleSpy.info.mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed).toMatchObject({
        level: 'info',
        message: 'test',
        requestId: '123',
        extra: 'data',
      })
    })
  })

  describe('type exports', () => {
    it('should export Logger type', () => {
      const log: Logger = createLogger()
      expect(log.debug).toBeDefined()
      expect(log.info).toBeDefined()
      expect(log.warn).toBeDefined()
      expect(log.error).toBeDefined()
      expect(log.child).toBeDefined()
    })

    it('should export LogLevel type', () => {
      const level: LogLevel = 'debug'
      expect(level).toBe('debug')
    })

    it('should export LogContext type', () => {
      const context: LogContext = { key: 'value', nested: { a: 1 } }
      expect(context).toBeDefined()
    })
  })
})
