/**
 * Validation Tests for MDXE Zod Schemas
 *
 * Tests Zod schema validation for SDKProviderConfig, EvaluateOptions, and CLI options.
 *
 * @module mdxe/tests/validation
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Import schemas to be created
import {
  SDKProviderConfigSchema,
  EvaluateOptionsSchema,
  CliOptionsSchema,
  WorkerdSDKConfigSchema,
  ExecutionContextSchema,
  DeployOptionsSchema,
  TestOptionsSchema,
  validateConfig,
  createSchemaFactory,
} from '../src/schemas.js'

describe('SDKProviderConfigSchema', () => {
  describe('valid configurations', () => {
    it('validates minimal local config', () => {
      const config = {
        context: 'local',
        db: 'memory',
        aiMode: 'local',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates full local config', () => {
      const config = {
        context: 'local',
        db: 'sqlite',
        aiMode: 'local',
        ns: 'test.example.com',
        dbPath: './data.db',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates remote config', () => {
      const config = {
        context: 'remote',
        db: 'memory',
        aiMode: 'remote',
        ns: 'production.example.com',
        rpcUrl: 'https://rpc.do',
        token: 'test-token-123',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates all database backend options', () => {
      const backends = ['memory', 'fs', 'sqlite', 'postgres', 'clickhouse', 'mongo'] as const
      for (const db of backends) {
        const config = { context: 'local' as const, db, aiMode: 'local' as const }
        const result = SDKProviderConfigSchema.safeParse(config)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('invalid configurations', () => {
    it('rejects missing context', () => {
      const config = {
        db: 'memory',
        aiMode: 'local',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects invalid context value', () => {
      const config = {
        context: 'invalid',
        db: 'memory',
        aiMode: 'local',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects missing db', () => {
      const config = {
        context: 'local',
        aiMode: 'local',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects invalid db backend', () => {
      const config = {
        context: 'local',
        db: 'invalid-backend',
        aiMode: 'local',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects missing aiMode', () => {
      const config = {
        context: 'local',
        db: 'memory',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects invalid aiMode', () => {
      const config = {
        context: 'local',
        db: 'memory',
        aiMode: 'hybrid',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects invalid rpcUrl format', () => {
      const config = {
        context: 'remote',
        db: 'memory',
        aiMode: 'remote',
        rpcUrl: 'not-a-valid-url',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects empty namespace', () => {
      const config = {
        context: 'local',
        db: 'memory',
        aiMode: 'local',
        ns: '',
      }
      const result = SDKProviderConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })
})

describe('WorkerdSDKConfigSchema', () => {
  describe('valid configurations', () => {
    it('validates minimal config', () => {
      const config = {
        context: 'local',
        ns: 'test.example.com',
      }
      const result = WorkerdSDKConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates config with rpcUrl and token', () => {
      const config = {
        context: 'remote',
        ns: 'production.example.com',
        rpcUrl: 'https://rpc.do',
        token: 'test-token',
      }
      const result = WorkerdSDKConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates config with bindings object', () => {
      const config = {
        context: 'remote',
        ns: 'test.example.com',
        bindings: {
          KV: {},
          D1: {},
        },
      }
      const result = WorkerdSDKConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid configurations', () => {
    it('rejects missing ns', () => {
      const config = {
        context: 'local',
      }
      const result = WorkerdSDKConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects invalid context', () => {
      const config = {
        context: 'hybrid',
        ns: 'test.example.com',
      }
      const result = WorkerdSDKConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects empty ns', () => {
      const config = {
        context: 'local',
        ns: '',
      }
      const result = WorkerdSDKConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })
})

describe('EvaluateOptionsSchema', () => {
  describe('valid options', () => {
    it('validates minimal options', () => {
      const options = {
        tests: 'describe("test", () => {})',
      }
      const result = EvaluateOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })

    it('validates options with sdk config', () => {
      const options = {
        tests: 'describe("test", () => {})',
        sdk: {
          context: 'local',
          ns: 'test.example.com',
        },
      }
      const result = EvaluateOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })

    it('validates options with imports', () => {
      const options = {
        tests: 'describe("test", () => {})',
        imports: ['import { expect } from "vitest"'],
      }
      const result = EvaluateOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })

    it('validates options with timeout', () => {
      const options = {
        tests: 'describe("test", () => {})',
        timeout: 30000,
      }
      const result = EvaluateOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid options', () => {
    it('rejects missing tests code', () => {
      const options = {
        sdk: { context: 'local', ns: 'test' },
      }
      const result = EvaluateOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })

    it('rejects empty tests code', () => {
      const options = {
        tests: '',
      }
      const result = EvaluateOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })

    it('rejects invalid timeout (negative)', () => {
      const options = {
        tests: 'describe("test", () => {})',
        timeout: -1000,
      }
      const result = EvaluateOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })

    it('rejects invalid imports type', () => {
      const options = {
        tests: 'describe("test", () => {})',
        imports: 'not-an-array',
      }
      const result = EvaluateOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })
  })
})

describe('CliOptionsSchema', () => {
  describe('valid CLI options', () => {
    it('validates test command options', () => {
      const options = {
        command: 'test',
        projectDir: '/path/to/project',
        context: 'local',
        target: 'workers',
        db: 'memory',
        aiMode: 'local',
      }
      const result = CliOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })

    it('validates deploy command options', () => {
      const options = {
        command: 'deploy',
        projectDir: '/path/to/project',
        platform: 'cloudflare',
        dryRun: true,
      }
      const result = CliOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })

    it('validates dev command options', () => {
      const options = {
        command: 'dev',
        projectDir: '/path/to/project',
        port: 3000,
        host: 'localhost',
      }
      const result = CliOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })

    it('validates all command types', () => {
      const commands = ['dev', 'build', 'start', 'deploy', 'test', 'run', 'admin', 'notebook', 'tail', 'db', 'db:server', 'db:client', 'db:publish', 'help', 'version'] as const
      for (const cmd of commands) {
        const options = {
          command: cmd,
          projectDir: '/path',
        }
        const result = CliOptionsSchema.safeParse(options)
        expect(result.success).toBe(true)
      }
    })

    it('validates all platform types', () => {
      const platforms = ['do', 'cloudflare', 'vercel', 'github'] as const
      for (const platform of platforms) {
        const options = {
          command: 'deploy',
          projectDir: '/path',
          platform,
        }
        const result = CliOptionsSchema.safeParse(options)
        expect(result.success).toBe(true)
      }
    })

    it('validates all target types', () => {
      const targets = ['node', 'bun', 'workers', 'all'] as const
      for (const target of targets) {
        const options = {
          command: 'test',
          projectDir: '/path',
          target,
        }
        const result = CliOptionsSchema.safeParse(options)
        expect(result.success).toBe(true)
      }
    })

    it('validates all db types', () => {
      const dbs = ['memory', 'fs', 'sqlite', 'sqlite-do', 'clickhouse', 'all'] as const
      for (const db of dbs) {
        const options = {
          command: 'test',
          projectDir: '/path',
          db,
        }
        const result = CliOptionsSchema.safeParse(options)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('invalid CLI options', () => {
    it('rejects invalid command', () => {
      const options = {
        command: 'invalid-command',
        projectDir: '/path',
      }
      const result = CliOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })

    it('rejects missing projectDir', () => {
      const options = {
        command: 'dev',
      }
      const result = CliOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })

    it('rejects invalid platform', () => {
      const options = {
        command: 'deploy',
        projectDir: '/path',
        platform: 'invalid-platform',
      }
      const result = CliOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })

    it('rejects invalid port (negative)', () => {
      const options = {
        command: 'dev',
        projectDir: '/path',
        port: -1,
      }
      const result = CliOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })

    it('rejects invalid port (too high)', () => {
      const options = {
        command: 'dev',
        projectDir: '/path',
        port: 70000,
      }
      const result = CliOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })
  })
})

describe('ExecutionContextSchema', () => {
  describe('valid contexts', () => {
    it('validates empty context', () => {
      const ctx = {}
      const result = ExecutionContextSchema.safeParse(ctx)
      expect(result.success).toBe(true)
    })

    it('validates context with env', () => {
      const ctx = {
        env: { NODE_ENV: 'test', API_KEY: 'secret' },
      }
      const result = ExecutionContextSchema.safeParse(ctx)
      expect(result.success).toBe(true)
    })

    it('validates context with timeout', () => {
      const ctx = {
        timeout: 5000,
      }
      const result = ExecutionContextSchema.safeParse(ctx)
      expect(result.success).toBe(true)
    })

    it('validates full context', () => {
      const ctx = {
        env: { NODE_ENV: 'test' },
        cwd: '/path/to/project',
        timeout: 10000,
        input: { data: 'test' },
        props: { key: 'value' },
      }
      const result = ExecutionContextSchema.safeParse(ctx)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid contexts', () => {
    it('rejects invalid timeout (negative)', () => {
      const ctx = {
        timeout: -1000,
      }
      const result = ExecutionContextSchema.safeParse(ctx)
      expect(result.success).toBe(false)
    })

    it('rejects invalid env type', () => {
      const ctx = {
        env: 'not-an-object',
      }
      const result = ExecutionContextSchema.safeParse(ctx)
      expect(result.success).toBe(false)
    })
  })
})

describe('DeployOptionsSchema', () => {
  describe('valid options', () => {
    it('validates minimal options', () => {
      const options = {}
      const result = DeployOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })

    it('validates cloudflare options', () => {
      const options = {
        target: 'production',
        platform: 'cloudflare',
        env: { API_URL: 'https://api.example.com' },
        dryRun: true,
      }
      const result = DeployOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid options', () => {
    it('rejects invalid platform', () => {
      const options = {
        platform: 'invalid-platform',
      }
      const result = DeployOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })
  })
})

describe('TestOptionsSchema', () => {
  describe('valid options', () => {
    it('validates minimal options', () => {
      const options = {}
      const result = TestOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })

    it('validates full options', () => {
      const options = {
        pattern: '*.test.ts',
        watch: true,
        coverage: true,
        timeout: 30000,
        target: './tests',
      }
      const result = TestOptionsSchema.safeParse(options)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid options', () => {
    it('rejects invalid timeout (negative)', () => {
      const options = {
        timeout: -1,
      }
      const result = TestOptionsSchema.safeParse(options)
      expect(result.success).toBe(false)
    })
  })
})

describe('validateConfig helper', () => {
  it('returns validated config on success', () => {
    const config = {
      context: 'local',
      db: 'memory',
      aiMode: 'local',
    }
    const result = validateConfig(SDKProviderConfigSchema, config)
    expect(result).toEqual(config)
  })

  it('throws on validation failure', () => {
    const config = {
      context: 'invalid',
      db: 'memory',
      aiMode: 'local',
    }
    expect(() => validateConfig(SDKProviderConfigSchema, config)).toThrow()
  })

  it('provides detailed error messages', () => {
    const config = {
      context: 'invalid',
      db: 'memory',
      aiMode: 'local',
    }
    try {
      validateConfig(SDKProviderConfigSchema, config)
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect((e as Error).message).toContain('context')
    }
  })
})

describe('createSchemaFactory', () => {
  it('creates schema with custom extensions', () => {
    const factory = createSchemaFactory()
    const CustomSchema = factory.extend(SDKProviderConfigSchema, {
      customField: z.string().optional(),
    })

    const config = {
      context: 'local',
      db: 'memory',
      aiMode: 'local',
      customField: 'extra',
    }
    const result = CustomSchema.safeParse(config)
    expect(result.success).toBe(true)
  })

  it('creates partial schema', () => {
    const factory = createSchemaFactory()
    const PartialSchema = factory.partial(SDKProviderConfigSchema)

    const config = {
      context: 'local',
    }
    const result = PartialSchema.safeParse(config)
    expect(result.success).toBe(true)
  })

  it('creates strict schema that rejects unknown fields', () => {
    const factory = createSchemaFactory()
    const StrictSchema = factory.strict(SDKProviderConfigSchema)

    const config = {
      context: 'local',
      db: 'memory',
      aiMode: 'local',
      unknownField: 'should-fail',
    }
    const result = StrictSchema.safeParse(config)
    expect(result.success).toBe(false)
  })
})
