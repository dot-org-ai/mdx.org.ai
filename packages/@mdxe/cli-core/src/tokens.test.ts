/**
 * tokens — every count is LABELLED with how it was produced; the native cache fails CLOSED on a
 * miss or a base drift (never a fabricated precise-looking number); the open tokenizers never throw.
 */

import { describe, expect, test, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  approxTokenizer,
  loadTokenizer,
  countTokens,
  nativeTokenizer,
  loadNativeTokenizer,
  isNativeCacheEmpty,
  NativeTokenCacheMissError,
  NativeTokenCacheBaseDriftError,
  NATIVE_DIFF_BASE,
  NATIVE_METHOD,
  NATIVE_MODEL,
  NATIVE_ENDPOINT,
  CHARS_PER_TOKEN,
  type NativeTokenCache,
} from './tokens.js'

const sha = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex')

function cacheWith(entries: Record<string, number>, base = sha(NATIVE_DIFF_BASE)): NativeTokenCache {
  const e: Record<string, { model: string; input_tokens: number; measured_at: string }> = {}
  for (const [k, v] of Object.entries(entries)) e[k] = { model: NATIVE_MODEL, input_tokens: v, measured_at: '2026-01-01T00:00:00.000Z' }
  return { tokenizer: 'fable-native', method: NATIVE_METHOD, model: NATIVE_MODEL, endpoint: NATIVE_ENDPOINT, base_sha256: base, note: 'test', entries: e }
}

describe('approxTokenizer — the labelled fallback', () => {
  test('ceil(len / CHARS_PER_TOKEN), labelled chars-approx, never precise-looking', () => {
    const t = approxTokenizer('cl100k_base')
    expect(t.method).toBe('chars-approx')
    expect(t.count('')).toEqual({ count: 0, method: 'chars-approx', tokenizer: 'cl100k_base' })
    expect(t.count('abcde').count).toBe(Math.ceil(5 / CHARS_PER_TOKEN))
  })
})

describe('loadTokenizer — open tokenizers never throw and always label', () => {
  test('cl100k_base resolves to a precise OR an honestly-labelled approximate counter', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const t = await loadTokenizer('cl100k_base')
      const c = t.count('hello world')
      expect(c.tokenizer).toBe('cl100k_base')
      expect(['tiktoken-cl100k', 'chars-approx']).toContain(c.method)
      expect(c.method).toBe(t.method)
      if (c.method === 'chars-approx') expect(warn).toHaveBeenCalledTimes(1) // logged ONCE, never silent
      // memoised: same counter, and the warning is not repeated
      expect(await loadTokenizer('cl100k_base')).toBe(t)
      await countTokens('again', 'cl100k_base')
      if (c.method === 'chars-approx') expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  test('fable-native without a cache path fails closed (no silent estimate)', async () => {
    await expect(loadTokenizer('fable-native')).rejects.toThrow(/native cache file/)
  })
})

describe('nativeTokenizer — differencing, fail-closed', () => {
  const baseKey = sha(NATIVE_DIFF_BASE)

  test('count = entries[base+fragment] − entries[base], labelled anthropic-count-tokens', () => {
    const cache = cacheWith({ [baseKey]: 30, [sha(NATIVE_DIFF_BASE + 'hello')]: 32 })
    const t = nativeTokenizer(cache, sha)
    expect(t.count('hello')).toEqual({ count: 2, method: NATIVE_METHOD, tokenizer: 'fable-native' })
  })

  test('a fragment miss THROWS NativeTokenCacheMissError naming the sha and the repair protocol', () => {
    const t = nativeTokenizer(cacheWith({ [baseKey]: 30 }), sha)
    let caught: unknown
    try {
      t.count('unmeasured')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(NativeTokenCacheMissError)
    expect((caught as NativeTokenCacheMissError).sha).toBe(sha(NATIVE_DIFF_BASE + 'unmeasured'))
    expect((caught as Error).message).toContain(NATIVE_ENDPOINT)
  })

  test('a missing base entry is a miss too (the Day-0 empty cache)', () => {
    const empty = cacheWith({})
    expect(isNativeCacheEmpty(empty)).toBe(true)
    expect(() => nativeTokenizer(empty, sha).count('x')).toThrow(NativeTokenCacheMissError)
  })

  test('a base drift fails closed at construction', () => {
    expect(() => nativeTokenizer(cacheWith({}, 'deadbeef'), sha)).toThrow(NativeTokenCacheBaseDriftError)
  })
})

describe('loadNativeTokenizer — offline file read, memoised per path', () => {
  test('reads a schema-valid cache file; rejects an invalid one', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mdxe-tokens-'))
    const good = join(dir, 'good.json')
    writeFileSync(good, JSON.stringify(cacheWith({ [sha(NATIVE_DIFF_BASE)]: 10, [sha(NATIVE_DIFF_BASE + 'a')]: 11 })))
    const { tokenizer, cacheData } = await loadNativeTokenizer(good)
    expect(tokenizer.count('a').count).toBe(1)
    expect(cacheData.model).toBe(NATIVE_MODEL)
    expect(await loadNativeTokenizer(good)).toEqual({ tokenizer, cacheData })

    const bad = join(dir, 'bad.json')
    writeFileSync(bad, JSON.stringify({ tokenizer: 'other' }))
    await expect(loadNativeTokenizer(bad)).rejects.toThrow(/not schema-valid/)
    await expect(countTokens('a', 'fable-native', good)).resolves.toMatchObject({ count: 1, method: NATIVE_METHOD })
  })
})
