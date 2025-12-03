import { readFileSync, writeFileSync } from 'node:fs'
import { Script } from 'node:vm'

const content = readFileSync('./tests/http.mdx', 'utf-8')
// Updated regex with line-start anchoring
const regex = /^```(?:ts|typescript|js|javascript)\s+test(?:\s+name="([^"]*)")?[^\n]*\n([\s\S]*?)^```$/gm

// Extract imports
function extractImports(code: string) {
  const imports: string[] = []
  const lines = code.split('\n')
  const nonImportLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      imports.push(trimmed)
    } else if (!trimmed.startsWith('export ')) {
      nonImportLines.push(line)
    }
  }
  return { imports, codeWithoutImports: nonImportLines.join('\n').trim() }
}

let match
let idx = 0
const tests: { name: string; code: string }[] = []

while ((match = regex.exec(content)) !== null) {
  idx++
  const name = `test ${idx}`
  const rawCode = match[2].trim()
  const { codeWithoutImports } = extractImports(rawCode)
  tests.push({ name, code: codeWithoutImports })
}

// Generate test code
const testCases = tests.map(test => {
  const isAsync = /\bawait\s+/.test(test.code)
  const asyncPrefix = isAsync ? 'async ' : ''
  return `
  it('${test.name.replace(/'/g, "\\'")}', ${asyncPrefix}() => {
${test.code}
  });`
}).join('\n')

const testCode = `describe('MDX Tests', () => {${testCases}
});`

console.log(`Total tests: ${idx}`)
console.log(`Generated code length: ${testCode.length}`)

// Try to find line 3053 (if it's a line number not char position)
const lines = testCode.split('\n')
console.log(`\nTotal lines: ${lines.length}`)

// Write test code to file for inspection
writeFileSync('/tmp/generated-tests.js', testCode)
console.log('Wrote to /tmp/generated-tests.js')

// Check Node.js parsing
try {
  new Script(testCode)
  console.log('Parse OK!')
} catch (e: any) {
  console.log(`\nParse error:`)
  console.log(e.message)
}
