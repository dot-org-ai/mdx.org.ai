/**
 * Worker code generation for MDX evaluation
 *
 * This module provides functions to generate worker code for sandboxed execution.
 * It follows patterns from ai-evaluate, adapted for MDX content.
 *
 * @packageDocumentation
 */

/**
 * Options for generating worker code
 */
export interface GenerateWorkerOptions {
  /** Module code to embed (ES6 or CommonJS) */
  module?: string
  /** Script code to execute */
  script?: string
  /** Execution timeout in milliseconds */
  timeout?: number
  /** Block network access */
  blockNetwork?: boolean
}

/**
 * Extract export names from module code
 * Supports both CommonJS (exports.foo) and ES module (export const foo) syntax
 *
 * @param moduleCode - The module code to extract export names from
 * @returns Comma-separated string of export names, or "_unused" if none found
 */
export function getExportNames(moduleCode: string): string {
  const names = new Set<string>()

  // Match exports.name = ...
  const dotPattern = /exports\.(\w+)\s*=/g
  let match
  while ((match = dotPattern.exec(moduleCode)) !== null) {
    if (match[1]) names.add(match[1])
  }

  // Match exports['name'] = ... or exports["name"] = ...
  const bracketPattern = /exports\[['"](\w+)['"]\]\s*=/g
  while ((match = bracketPattern.exec(moduleCode)) !== null) {
    if (match[1]) names.add(match[1])
  }

  // Match export const name = ... or export let name = ... or export var name = ...
  const esConstPattern = /export\s+(?:const|let|var)\s+(\w+)\s*=/g
  while ((match = esConstPattern.exec(moduleCode)) !== null) {
    if (match[1]) names.add(match[1])
  }

  // Match export function name(...) or export async function name(...) or export async function* name(...)
  const esFunctionPattern = /export\s+(?:async\s+)?function\*?\s+(\w+)\s*\(/g
  while ((match = esFunctionPattern.exec(moduleCode)) !== null) {
    if (match[1]) names.add(match[1])
  }

  // Match export class name
  const esClassPattern = /export\s+class\s+(\w+)/g
  while ((match = esClassPattern.exec(moduleCode)) !== null) {
    if (match[1]) names.add(match[1])
  }

  return Array.from(names).join(', ') || '_unused'
}

/**
 * Transform module code to work in sandbox
 * Converts ES module exports to CommonJS-style for the sandbox
 *
 * @param moduleCode - ES6 module code
 * @returns Transformed code with CommonJS-style exports
 */
export function transformModuleCode(moduleCode: string): string {
  let code = moduleCode

  // Transform: export const foo = ... -> const foo = exports.foo = ...
  code = code.replace(/export\s+(const|let|var)\s+(\w+)\s*=/g, '$1 $2 = exports.$2 =')

  // Transform: export function foo(...) -> function foo(...) exports.foo = foo;
  // Also handles async generators: export async function* foo
  code = code.replace(/export\s+(async\s+)?function(\*?)\s+(\w+)/g, '$1function$2 $3')
  // Add exports for functions after their definition
  const funcPattern = /export\s+(?:async\s+)?function\*?\s+(\w+)/g
  let funcMatch
  while ((funcMatch = funcPattern.exec(moduleCode)) !== null) {
    if (funcMatch[1]) {
      code += `\nexports.${funcMatch[1]} = ${funcMatch[1]};`
    }
  }

  // Transform: export class Foo -> class Foo; exports.Foo = Foo;
  code = code.replace(/export\s+class\s+(\w+)/g, 'class $1')
  const classPattern = /export\s+class\s+(\w+)/g
  let classMatch
  while ((classMatch = classPattern.exec(moduleCode)) !== null) {
    if (classMatch[1]) {
      code += `\nexports.${classMatch[1]} = ${classMatch[1]};`
    }
  }

  return code
}

/**
 * Wrap script to auto-return the last expression
 * Converts: `add(1, 2)` -> `return add(1, 2)`
 *
 * @param script - Script code to wrap
 * @returns Script with auto-return for last expression
 */
export function wrapScriptForReturn(script: string): string {
  const trimmed = script.trim()
  if (!trimmed) return script

  // If script already contains a return statement anywhere, don't modify
  if (/\breturn\b/.test(trimmed)) return script

  // If script starts with throw, don't modify
  if (/^\s*throw\b/.test(trimmed)) return script

  // If it's a single expression (no newlines, no semicolons except at end), wrap it
  const withoutTrailingSemi = trimmed.replace(/;?\s*$/, '')
  const isSingleLine = !withoutTrailingSemi.includes('\n')

  // Check if it looks like a single expression (no control flow, no declarations)
  const startsWithKeyword =
    /^\s*(const|let|var|if|for|while|switch|try|class|function|async\s+function)\b/.test(
      withoutTrailingSemi
    )

  if (isSingleLine && !startsWithKeyword) {
    return `return ${withoutTrailingSemi}`
  }

  // For multi-statement scripts, try to return the last expression
  const lines = trimmed.split('\n')
  const lastLineRaw = lines[lines.length - 1]
  if (!lastLineRaw) return script
  const lastLine = lastLineRaw.trim()

  // If last line is an expression (not a declaration, control flow, or throw)
  if (
    lastLine &&
    !/^\s*(const|let|var|if|for|while|switch|try|class|function|return|throw)\b/.test(lastLine)
  ) {
    lines[lines.length - 1] = `return ${lastLine.replace(/;?\s*$/, '')}`
    return lines.join('\n')
  }

  return script
}

/**
 * Generate worker code for MDX evaluation
 *
 * This function generates a complete worker module string that can be
 * executed in a Cloudflare Worker or workerd isolate. It embeds the
 * module code, script, and provides console capture and error handling.
 *
 * @param options - Generation options
 * @returns Complete worker code string
 *
 * @example
 * ```ts
 * const workerCode = generateWorkerCode({
 *   module: 'exports.add = (a, b) => a + b',
 *   script: 'add(1, 2)',
 * })
 * ```
 */
export function generateWorkerCode(options: GenerateWorkerOptions = {}): string {
  const {
    module: rawModule = '',
    script: rawScript = '',
  } = options

  const module = rawModule ? transformModuleCode(rawModule) : ''
  const script = rawScript ? wrapScriptForReturn(rawScript) : ''
  const exportNames = getExportNames(rawModule)

  return `
// MDX Worker Entry Point
// Generated by @mdxe/workers

const logs = [];

// Capture console output
const originalConsole = { ...console };
const captureConsole = (level) => (...args) => {
  logs.push({
    level,
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
    timestamp: Date.now()
  });
  originalConsole[level](...args);
};
console.log = captureConsole('log');
console.warn = captureConsole('warn');
console.error = captureConsole('error');
console.info = captureConsole('info');
console.debug = captureConsole('debug');

// ============================================================
// USER MODULE CODE (embedded at generation time)
// ============================================================
// Module exports object - exports become top-level variables
const exports = {};

${
  module
    ? `
// Execute module code
try {
${module}
} catch (e) {
  console.error('Module error:', e.message);
}
`
    : '// No module code provided'
}

// Expose all exports as top-level variables for scripts
// This allows: exports.add = (a, b) => a + b; then later: add(1, 2)
${
  rawModule
    ? `
const { ${exportNames} } = exports;
`.trim()
    : ''
}

// ============================================================
// WORKER ENTRY POINT
// ============================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route: GET / - Return info about exports
    if (request.method === 'GET' && url.pathname === '/') {
      return Response.json({
        exports: Object.keys(exports),
        execute: '/execute'
      });
    }

    // Route: GET /:name - Simple JSON endpoint to access exports
    if (request.method === 'GET' && url.pathname !== '/execute') {
      const name = url.pathname.slice(1); // Remove leading /
      const value = exports[name];

      // Check if export exists
      if (!(name in exports)) {
        return Response.json({ error: \`Export "\${name}" not found\` }, { status: 404 });
      }

      // If it's not a function, just return the value
      if (typeof value !== 'function') {
        return Response.json({ result: value });
      }

      // It's a function - parse args and call it
      try {
        const args = [];
        const argsParam = url.searchParams.get('args');
        if (argsParam) {
          // Support JSON array: ?args=[1,2,3]
          try {
            const parsed = JSON.parse(argsParam);
            if (Array.isArray(parsed)) {
              args.push(...parsed);
            } else {
              args.push(parsed);
            }
          } catch {
            // Not JSON, use as single string arg
            args.push(argsParam);
          }
        } else {
          // Support named params: ?a=1&b=2 -> passed as object
          const params = Object.fromEntries(url.searchParams.entries());
          if (Object.keys(params).length > 0) {
            // Try to parse numeric values
            for (const [key, val] of Object.entries(params)) {
              const num = Number(val);
              params[key] = !isNaN(num) && val !== '' ? num : val;
            }
            args.push(params);
          }
        }

        const result = await value(...args);
        return Response.json({ result });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // Route: /execute - Run scripts
    let scriptResult = undefined;
    let scriptError = null;

    // Execute user script
    ${
      script
        ? `
    try {
      scriptResult = await (async () => {
${script}
      })();
    } catch (e) {
      console.error('Script error:', e.message);
      scriptError = e.message;
    }
    `
        : '// No script code provided'
    }

    const success = scriptError === null;

    return Response.json({
      success,
      value: scriptResult,
      logs,
      error: scriptError || undefined,
      duration: 0
    });
  }
};
`
}

/**
 * Generate worker code from compiled MDX module
 *
 * This is a higher-level function that takes compiled MDX output
 * and generates worker code suitable for execution.
 *
 * @param compiledModule - Compiled MDX module code
 * @param options - Additional generation options
 * @returns Complete worker code string
 */
export function generateWorkerFromMDX(
  compiledModule: string,
  options: Omit<GenerateWorkerOptions, 'module'> = {}
): string {
  return generateWorkerCode({
    ...options,
    module: compiledModule,
  })
}
