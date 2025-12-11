import { describe, it, expect } from 'vitest'
import { parseStreamJson } from './runner/parser.js'

describe('@mdxai/code', () => {
  describe('parseStreamJson', () => {
    it('should parse valid JSON', () => {
      const line = '{"type":"assistant","content":"Hello"}'
      const result = parseStreamJson(line)

      expect(result).toBeDefined()
      expect(result?.type).toBe('assistant')
      expect(result?.data).toEqual({ type: 'assistant', content: 'Hello' })
    })

    it('should return null for invalid JSON', () => {
      const line = 'not json'
      const result = parseStreamJson(line)

      expect(result).toBeNull()
    })

    it('should return null for empty lines', () => {
      const result = parseStreamJson('')
      expect(result).toBeNull()
    })
  })
})
