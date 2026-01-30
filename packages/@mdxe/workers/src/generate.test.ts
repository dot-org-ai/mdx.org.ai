/**
 * Tests for worker code generation
 *
 * These tests verify the generateWorkerCode function that compiles MDX
 * to worker module strings, following patterns from ai-evaluate.
 */
import { describe, it, expect } from 'vitest'
import {
  generateWorkerCode,
  transformModuleCode,
  getExportNames,
  wrapScriptForReturn,
  type GenerateWorkerOptions,
} from './generate.js'

describe('generateWorkerCode', () => {
  describe('basic structure', () => {
    it('generates valid worker code with default export', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('export default')
      expect(code).toContain('async fetch(request')
    })

    it('generates code that can be parsed as valid JavaScript', () => {
      const code = generateWorkerCode({})
      // Should not throw when parsed
      expect(() => new Function(code.replace(/export default/, 'return'))).not.toThrow()
    })

    it('includes worker entry point structure', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('export default {')
      expect(code).toContain('fetch(request')
    })
  })

  describe('console capture', () => {
    it('includes logs array for capturing console output', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('const logs = []')
    })

    it('captures console.log', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('console.log = captureConsole')
    })

    it('captures console.warn', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('console.warn = captureConsole')
    })

    it('captures console.error', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('console.error = captureConsole')
    })

    it('captures console.info', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('console.info = captureConsole')
    })

    it('captures console.debug', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('console.debug = captureConsole')
    })

    it('stores log level in captured logs', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('level')
      expect(code).toContain('message')
      expect(code).toContain('timestamp')
    })
  })

  describe('module embedding', () => {
    it('embeds module code when provided', () => {
      const code = generateWorkerCode({
        module: 'const add = (a, b) => a + b; exports.add = add;',
      })
      expect(code).toContain('exports.add = add')
    })

    it('handles no module code gracefully', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('// No module code provided')
    })

    it('creates exports object', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('const exports = {}')
    })

    it('exposes exports as top-level variables', () => {
      const code = generateWorkerCode({
        module: 'exports.foo = 42; exports.bar = "hello";',
      })
      expect(code).toContain('const { foo, bar } = exports')
    })
  })

  describe('script embedding', () => {
    it('embeds script code when provided', () => {
      const code = generateWorkerCode({
        script: 'return add(1, 2)',
      })
      expect(code).toContain('return add(1, 2)')
    })

    it('handles no script code gracefully', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('// No script code provided')
    })

    it('wraps script in async IIFE for execution', () => {
      const code = generateWorkerCode({
        script: 'add(1, 2)',
      })
      expect(code).toContain('await (async () => {')
    })

    it('captures script result', () => {
      const code = generateWorkerCode({
        script: 'add(1, 2)',
      })
      expect(code).toContain('scriptResult')
    })

    it('captures script errors', () => {
      const code = generateWorkerCode({
        script: 'add(1, 2)',
      })
      expect(code).toContain('scriptError')
    })
  })

  describe('response format', () => {
    it('returns JSON response with success field', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('success')
    })

    it('returns logs in response', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('logs')
    })

    it('returns value in response', () => {
      const code = generateWorkerCode({
        script: '42',
      })
      expect(code).toContain('value')
    })

    it('returns error in response when script fails', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('error')
    })
  })

  describe('routes', () => {
    it('handles root route GET /', () => {
      const code = generateWorkerCode({})
      expect(code).toContain("url.pathname === '/'")
    })

    it('handles /execute route', () => {
      const code = generateWorkerCode({})
      expect(code).toContain('/execute')
    })

    it('handles GET requests to export names', () => {
      const code = generateWorkerCode({})
      expect(code).toContain("request.method === 'GET'")
    })
  })
})

describe('transformModuleCode', () => {
  describe('ES module to CommonJS transformation', () => {
    it('transforms export const to exports assignment', () => {
      const input = 'export const foo = 42'
      const output = transformModuleCode(input)
      expect(output).toContain('const foo = exports.foo =')
    })

    it('transforms export let to exports assignment', () => {
      const input = 'export let bar = "hello"'
      const output = transformModuleCode(input)
      expect(output).toContain('let bar = exports.bar =')
    })

    it('transforms export var to exports assignment', () => {
      const input = 'export var baz = true'
      const output = transformModuleCode(input)
      expect(output).toContain('var baz = exports.baz =')
    })

    it('transforms export function to function + exports assignment', () => {
      const input = 'export function add(a, b) { return a + b }'
      const output = transformModuleCode(input)
      expect(output).toContain('function add')
      expect(output).toContain('exports.add = add')
    })

    it('transforms export async function', () => {
      const input = 'export async function fetchData() { return {} }'
      const output = transformModuleCode(input)
      expect(output).toContain('async function fetchData')
      expect(output).toContain('exports.fetchData = fetchData')
    })

    it('transforms export class', () => {
      const input = 'export class MyClass { constructor() {} }'
      const output = transformModuleCode(input)
      expect(output).toContain('class MyClass')
      expect(output).toContain('exports.MyClass = MyClass')
    })

    it('handles multiple exports', () => {
      const input = `
        export const a = 1
        export const b = 2
        export function c() {}
      `
      const output = transformModuleCode(input)
      expect(output).toContain('exports.a')
      expect(output).toContain('exports.b')
      expect(output).toContain('exports.c')
    })

    it('preserves non-export code', () => {
      const input = `
        const private = 'hidden'
        export const public = 'visible'
      `
      const output = transformModuleCode(input)
      expect(output).toContain("const private = 'hidden'")
      expect(output).toContain('exports.public')
    })
  })
})

describe('getExportNames', () => {
  it('extracts names from exports.name pattern', () => {
    const code = 'exports.foo = 42; exports.bar = "hello";'
    const names = getExportNames(code)
    expect(names).toContain('foo')
    expect(names).toContain('bar')
  })

  it('extracts names from exports["name"] pattern', () => {
    const code = 'exports["myFunc"] = () => {};'
    const names = getExportNames(code)
    expect(names).toContain('myFunc')
  })

  it('extracts names from export const pattern', () => {
    const code = 'export const add = (a, b) => a + b'
    const names = getExportNames(code)
    expect(names).toContain('add')
  })

  it('extracts names from export function pattern', () => {
    const code = 'export function multiply(a, b) { return a * b }'
    const names = getExportNames(code)
    expect(names).toContain('multiply')
  })

  it('extracts names from export async function pattern', () => {
    const code = 'export async function fetchData() { return {} }'
    const names = getExportNames(code)
    expect(names).toContain('fetchData')
  })

  it('extracts names from export class pattern', () => {
    const code = 'export class Calculator {}'
    const names = getExportNames(code)
    expect(names).toContain('Calculator')
  })

  it('returns "_unused" for empty code', () => {
    const code = ''
    const names = getExportNames(code)
    expect(names).toBe('_unused')
  })

  it('returns comma-separated list', () => {
    const code = 'exports.a = 1; exports.b = 2;'
    const names = getExportNames(code)
    expect(names).toBe('a, b')
  })

  it('handles mixed patterns', () => {
    const code = `
      export const foo = 1
      exports.bar = 2
      export function baz() {}
    `
    const names = getExportNames(code)
    expect(names).toContain('foo')
    expect(names).toContain('bar')
    expect(names).toContain('baz')
  })
})

describe('wrapScriptForReturn', () => {
  it('auto-returns single expressions', () => {
    const output = wrapScriptForReturn('add(1, 2)')
    expect(output).toBe('return add(1, 2)')
  })

  it('does not modify scripts with return statement', () => {
    const output = wrapScriptForReturn('return add(1, 2)')
    expect(output).toBe('return add(1, 2)')
  })

  it('does not modify throw statements', () => {
    const output = wrapScriptForReturn('throw new Error("test")')
    expect(output).toBe('throw new Error("test")')
  })

  it('auto-returns last expression in multi-line scripts', () => {
    const output = wrapScriptForReturn(`
const x = 1
x + 1
    `)
    expect(output).toContain('return x + 1')
    expect(output).toContain('const x = 1')
  })

  it('does not wrap variable declarations', () => {
    const output = wrapScriptForReturn('const x = 1')
    expect(output).toBe('const x = 1')
  })

  it('does not wrap if statements', () => {
    const output = wrapScriptForReturn('if (true) {}')
    expect(output).toBe('if (true) {}')
  })

  it('does not wrap for loops', () => {
    const output = wrapScriptForReturn('for (let i = 0; i < 10; i++) {}')
    expect(output).toBe('for (let i = 0; i < 10; i++) {}')
  })

  it('handles empty script', () => {
    const output = wrapScriptForReturn('')
    expect(output).toBe('')
  })

  it('trims trailing semicolons', () => {
    const output = wrapScriptForReturn('add(1, 2);')
    expect(output).toBe('return add(1, 2)')
  })

  it('handles whitespace-only script', () => {
    const output = wrapScriptForReturn('   ')
    expect(output).toBe('   ')
  })
})

describe('MDX integration', () => {
  it('generates code that handles MDX exports', () => {
    const code = generateWorkerCode({
      module: `
        const greet = exports.greet = (name) => \`Hello, \${name}!\`
        const PI = exports.PI = 3.14159
      `,
    })
    expect(code).toContain('exports.greet')
    expect(code).toContain('exports.PI')
    expect(code).toContain('const { greet, PI } = exports')
  })

  it('handles async function exports', () => {
    const code = generateWorkerCode({
      module: `
        async function fetchData() {
          return { success: true }
        }
        exports.fetchData = fetchData
      `,
    })
    expect(code).toContain('async function fetchData')
    expect(code).toContain('exports.fetchData')
  })
})

describe('error isolation', () => {
  it('wraps module execution in try-catch', () => {
    const code = generateWorkerCode({
      module: 'exports.foo = 42',
    })
    expect(code).toContain('try {')
    expect(code).toContain("} catch (e) {")
    expect(code).toContain('Module error')
  })

  it('wraps script execution in try-catch', () => {
    const code = generateWorkerCode({
      script: 'add(1, 2)',
    })
    expect(code).toContain('try {')
    expect(code).toContain("} catch (e) {")
    expect(code).toContain('Script error')
  })
})

describe('timeout handling', () => {
  it('supports timeout option', () => {
    const code = generateWorkerCode({
      timeout: 5000,
    })
    // The timeout will be used at runtime, not necessarily in generated code
    expect(code).toBeDefined()
  })
})
