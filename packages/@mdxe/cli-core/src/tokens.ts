/**
 * # @mdxe/cli-core `tokens` — the per-model token-count ORACLE (labelled counts, fail-closed cache)
 *
 * Ported from kestrel (`kestrel.markets` `src/render/tokens.ts`, MIT, © 2026 Nathan Clevenger) into
 * mdxe by mdx-8je.16 (lifted into the leaf package `@mdxe/cli-core` by mdx-8je.26), minus the kestrel-only committed fixture path and refresh script: here the
 * native cache path is an explicit argument, and a miss names the measurement protocol rather than
 * a repo script.
 *
 * A Rendering has two parameters: a **format** and the **tokenizer its token costs are measured
 * under** — "which glyphs are cheap is an empirical, per-model fact." This module IS that
 * tokenizer: it measures how many BPE tokens a rendered string costs a given model. It backs the
 * `x-markdown-tokens` header the text registers emit (mdx-8je.18) and any renderer benchmark.
 *
 * Three backends, and every result is LABELLED with the {@link CountMethod} that produced it, so a
 * consumer always knows whether it holds a precise BPE count, a provider-authoritative native count,
 * or a documented estimate — never a silently stubbed, fake-precise number:
 *   - `tiktoken-cl100k` / `tiktoken-o200k` — precise BPE via the OPTIONAL, LAZY `js-tiktoken`
 *     backend (a frozen merge table; a pure function of the input bytes).
 *   - `anthropic-count-tokens` — the CLOSED Claude/Fable tokenizer (`fable-native`), measured via
 *     the Anthropic `POST /v1/messages/count_tokens` endpoint with a base+fragment DIFFERENCING
 *     protocol, served OFFLINE from a committed `sha256(bytes) → input_tokens` cache. A cache miss
 *     FAILS CLOSED ({@link NativeTokenCacheMissError}) — it NEVER hits the network at read time.
 *   - `chars-approx` — the dependency-free `ceil(len / CHARS_PER_TOKEN)` fallback, always
 *     available. It is deliberately allowed to diverge from the true BPE count; the label is
 *     exactly what tells a consumer not to trust it as precise.
 *
 * STANDING CONSTRAINTS:
 *   - DETERMINISTIC: the BPE tables, the approximation, and the cache lookup are all pure
 *     functions of committed bytes.
 *   - NEVER SILENTLY STUBBED: if `js-tiktoken` is present the oracle MUST use it (no silent
 *     downgrade); if absent it reports `chars-approx` and logs ONCE that the precise backend is
 *     unavailable. The native backend NEVER falls back to an estimate on a miss — it throws.
 *   - LEAF MODULE: `js-tiktoken`, `node:fs`, and `node:crypto` are reached ONLY through lazy
 *     dynamic imports here, so importing this module costs nothing on the CLI hot path.
 */

/** Tokenizers the oracle can measure a Rendering's cost under. Extending the oracle = adding a row
 * to {@link REGISTRY}. */
export type TokenizerId = 'cl100k_base' | 'o200k_base' | 'fable-native'

/** The honest label of HOW a count was produced — the anti-fake-precise guarantee. */
export type CountMethod = 'tiktoken-cl100k' | 'tiktoken-o200k' | 'anthropic-count-tokens' | 'chars-approx'

/** The model whose tokenizer `fable-native` measures — the `model` on every count_tokens request. */
export const NATIVE_MODEL = 'claude-fable-5'

/** The {@link CountMethod} label for the native backend. */
export const NATIVE_METHOD = 'anthropic-count-tokens' as const

/** The Anthropic token-count endpoint the native cache is measured against. */
export const NATIVE_ENDPOINT = '/v1/messages/count_tokens'

/**
 * The FIXED, COMMITTED base message the native DIFFERENCING protocol subtracts. A count_tokens
 * response includes per-message/wrapper overhead; measuring `count(base + fragment) − count(base)`
 * cancels that overhead and isolates the fragment's true native cost. Editing this string
 * invalidates EVERY cached differenced count — the cache stores `base_sha256` so a drift is caught
 * at load ({@link NativeTokenCacheBaseDriftError}), never silently mis-differenced.
 */
export const NATIVE_DIFF_BASE =
  'mdxe native-token differencing base: a fixed committed anchor message. ' +
  'Do not edit — editing invalidates every cached differenced count.'

/** How a maintainer repairs a miss — named verbatim in the fail-closed error. */
export const NATIVE_REFRESH_HINT =
  'measure NATIVE_DIFF_BASE and NATIVE_DIFF_BASE + fragment against ' +
  `POST ${NATIVE_ENDPOINT} (model ${NATIVE_MODEL}, needs ANTHROPIC_API_KEY) and commit both entries ` +
  '(keyed by sha256 of the measured string) to the cache file'

/** A measured token cost of a Rendering under one tokenizer. */
export interface TokenCount {
  readonly count: number
  /** Precise BPE vs documented approximation — the count's provenance, always present. */
  readonly method: CountMethod
  readonly tokenizer: TokenizerId
}

/**
 * A resolved counter: pure + sync + deterministic once its backend is loaded. The async
 * dynamic-import cost is paid once by {@link loadTokenizer}; then `count()` is a pure function.
 */
export interface TokenCounter {
  readonly id: TokenizerId
  readonly method: CountMethod
  count(text: string): TokenCount
}

/** Documented approximation ratio: ~4 chars/token for English (OpenAI's own rule of thumb). */
export const CHARS_PER_TOKEN = 4

type Backend =
  | { readonly kind: 'tiktoken'; readonly encoding: string; readonly method: 'tiktoken-cl100k' | 'tiktoken-o200k' }
  | { readonly kind: 'native'; readonly model: string; readonly method: typeof NATIVE_METHOD }

/** The registry. One entry per known tokenizer; extending the oracle = adding a row. */
const REGISTRY: Readonly<Record<TokenizerId, Backend>> = {
  cl100k_base: { kind: 'tiktoken', encoding: 'cl100k_base', method: 'tiktoken-cl100k' },
  o200k_base: { kind: 'tiktoken', encoding: 'o200k_base', method: 'tiktoken-o200k' },
  'fable-native': { kind: 'native', model: NATIVE_MODEL, method: NATIVE_METHOD },
}

/** Minimal structural view of the parts of `js-tiktoken` the oracle uses. Kept local (not an
 *  import) so this module typechecks and ships WITHOUT the optional dependency installed. */
type Encoder = { encode(text: string): readonly number[] }
type TiktokenModule = {
  getEncoding?: (name: string) => Encoder
  default?: { getEncoding?: (name: string) => Encoder }
}

/**
 * The always-available, dependency-free fallback. `method` is always `chars-approx`, so it can
 * never masquerade as a precise BPE count; `count = ceil(len / CHARS_PER_TOKEN)` (0 for "").
 */
export function approxTokenizer(id: TokenizerId): TokenCounter {
  return {
    id,
    method: 'chars-approx',
    count(text: string): TokenCount {
      return { count: Math.ceil(text.length / CHARS_PER_TOKEN), method: 'chars-approx', tokenizer: id }
    },
  }
}

function tiktokenTokenizer(id: TokenizerId, enc: Encoder, method: 'tiktoken-cl100k' | 'tiktoken-o200k'): TokenCounter {
  return {
    id,
    method,
    count(text: string): TokenCount {
      return { count: enc.encode(text).length, method, tokenizer: id }
    },
  }
}

/** Ids we have already logged a fallback for — so the "backend unavailable" line prints ONCE. */
const warned = new Set<TokenizerId>()
/** Memoised loads: the dynamic import + encoding build is paid once per id, then reused. */
const cache = new Map<TokenizerId, Promise<TokenCounter>>()

async function resolveTokenizer(id: TokenizerId, nativeCachePath: string | undefined): Promise<TokenCounter> {
  const backend = REGISTRY[id]
  if (backend.kind === 'native') {
    // A closed model with a provider-authoritative count endpoint: served offline from the committed
    // native cache. NEVER falls back to an estimate — a miss THROWS (fail-closed) rather than fake it.
    if (nativeCachePath === undefined) {
      throw new Error(`tokenizer '${id}' needs a native cache file: pass the cache path to loadTokenizer/countTokens`)
    }
    return (await loadNativeTokenizer(nativeCachePath)).tokenizer
  }
  try {
    // Lazy + indirected specifier: the `: string` type stops tsc/bundlers from resolving
    // `js-tiktoken` at build time, so the package typechecks/builds with the optional dep uninstalled.
    const spec: string = 'js-tiktoken'
    const mod = (await import(spec)) as TiktokenModule
    const getEncoding = mod.getEncoding ?? mod.default?.getEncoding
    if (typeof getEncoding !== 'function') throw new Error('js-tiktoken: getEncoding not found')
    return tiktokenTokenizer(id, getEncoding(backend.encoding), backend.method)
  } catch {
    // Backend absent/unloadable: fall back to the LABELLED approximation — never a silent
    // downgrade, never a fake-precise count. Log once so the degrade is visible, not silent.
    if (!warned.has(id)) {
      warned.add(id)
      console.warn(
        `token oracle: precise backend 'js-tiktoken' unavailable for '${id}'; ` +
          `falling back to labelled 'chars-approx' (ceil(len/${CHARS_PER_TOKEN})).`,
      )
    }
    return approxTokenizer(id)
  }
}

/**
 * Lazily resolve the counter for `id`: try the js-tiktoken backend via a dynamic import; on ANY
 * load failure fall back to {@link approxTokenizer}. Never throws for the open tokenizers.
 * Memoised, so the async cost is paid once and the returned {@link TokenCounter.count} is
 * thereafter pure + sync. `fable-native` needs `nativeCachePath` and fails closed without it.
 */
export function loadTokenizer(id: TokenizerId, nativeCachePath?: string): Promise<TokenCounter> {
  const hit = cache.get(id)
  if (hit) return hit
  const loading = resolveTokenizer(id, nativeCachePath)
  cache.set(id, loading)
  // A rejected load must not poison the memo: the next call may pass a valid cache path.
  loading.catch(() => cache.delete(id))
  return loading
}

/** Convenience: load the tokenizer for `id` and count `text` in one call. */
export async function countTokens(text: string, id: TokenizerId, nativeCachePath?: string): Promise<TokenCount> {
  const tokenizer = await loadTokenizer(id, nativeCachePath)
  return tokenizer.count(text)
}

// ─────────────────────────────────────────────────────────────────────────────
// The `fable-native` backend — Anthropic count_tokens, DIFFERENCED, served OFFLINE from a
// committed cache.
// ─────────────────────────────────────────────────────────────────────────────

/** One measured count: the authoritative `input_tokens` the count_tokens endpoint returned for a
 * specific byte string, stamped with the `model` measured under and the `measured_at` timestamp.
 * Keyed in {@link NativeTokenCache.entries} by `sha256(utf8(bytes))`. */
export interface NativeTokenCacheEntry {
  readonly model: string
  readonly input_tokens: number
  /** ISO-8601 instant the measurement was taken (maintainer refresh time — off the read path). */
  readonly measured_at: string
}

/**
 * The committed offline cache the native backend reads. `entries` maps `sha256(utf8(measured
 * string))` → its measured count; the measured strings are the DIFFERENCING pairs — the base
 * ({@link NATIVE_DIFF_BASE}) and every `base + fragment`. `base_sha256` pins the base so an edit to
 * {@link NATIVE_DIFF_BASE} is caught at load rather than silently mis-differenced. An EMPTY
 * `entries` object is schema-valid (the Day-0 unmeasured state): every count then fails closed with
 * a repair-guiding {@link NativeTokenCacheMissError}, never a fabricated number.
 */
export interface NativeTokenCache {
  readonly tokenizer: 'fable-native'
  readonly method: typeof NATIVE_METHOD
  readonly model: string
  readonly endpoint: string
  readonly base_sha256: string
  readonly note: string
  readonly entries: Readonly<Record<string, NativeTokenCacheEntry>>
}

/**
 * Fail-closed miss: the native backend was asked to count a byte string whose measurement is not in
 * the committed cache, in offline (read) mode. The oracle refuses to fabricate a precise-looking
 * count. Carries the missing `sha` and the repair protocol so the fix is discoverable from the error.
 */
export class NativeTokenCacheMissError extends Error {
  readonly sha: string
  constructor(sha: string, which: string) {
    super(
      `native token cache MISS: ${which} (sha256=${sha}) is not in the committed cache. ` +
        `The 'fable-native' backend is offline-deterministic and will NOT hit the network at ` +
        `read time. To repair: ${NATIVE_REFRESH_HINT}`,
    )
    this.name = 'NativeTokenCacheMissError'
    this.sha = sha
  }
}

/** The committed cache's `base_sha256` disagrees with `sha256(NATIVE_DIFF_BASE)` — the base message
 * was edited without a re-measure, so every differenced count would be wrong. Fail closed at load. */
export class NativeTokenCacheBaseDriftError extends Error {
  constructor(cachedBase: string, computedBase: string) {
    super(
      `native token cache base drift: cache.base_sha256=${cachedBase} but sha256(NATIVE_DIFF_BASE)=` +
        `${computedBase}. NATIVE_DIFF_BASE was edited without a re-measure — every differenced count ` +
        `would be wrong. To repair: ${NATIVE_REFRESH_HINT}`,
    )
    this.name = 'NativeTokenCacheBaseDriftError'
  }
}

/** Is the committed cache in the Day-0 unmeasured (empty-but-schema-valid) state? */
export function isNativeCacheEmpty(cacheData: NativeTokenCache): boolean {
  return Object.keys(cacheData.entries).length === 0
}

/**
 * Construct the native {@link TokenCounter} from a cache + a sha256 function (injected so this stays a
 * pure function — the caller supplies `node:crypto` off the runtime path, and tests can supply the
 * same hash to exercise the DIFFERENCING arithmetic without touching the network).
 *
 * `count(text)` = `entries[sha(base+text)].input_tokens − entries[base].input_tokens`. A missing entry
 * (base or base+text) throws {@link NativeTokenCacheMissError}.
 */
export function nativeTokenizer(cacheData: NativeTokenCache, sha256Hex: (s: string) => string): TokenCounter {
  const baseKey = sha256Hex(NATIVE_DIFF_BASE)
  if (cacheData.base_sha256 !== baseKey) throw new NativeTokenCacheBaseDriftError(cacheData.base_sha256, baseKey)
  return {
    id: 'fable-native',
    method: NATIVE_METHOD,
    count(text: string): TokenCount {
      const base = cacheData.entries[baseKey]
      if (base === undefined) throw new NativeTokenCacheMissError(baseKey, 'differencing base')
      const fullKey = sha256Hex(NATIVE_DIFF_BASE + text)
      const full = cacheData.entries[fullKey]
      if (full === undefined) throw new NativeTokenCacheMissError(fullKey, `base+fragment (${text.length} chars)`)
      return { count: full.input_tokens - base.input_tokens, method: NATIVE_METHOD, tokenizer: 'fable-native' }
    },
  }
}

/** Lazily read `node:crypto` (off the hot path) and return a sync sha256-hex function. */
export async function nativeSha256(): Promise<(s: string) => string> {
  const { createHash } = await import('node:crypto')
  return (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
}

/**
 * Read a native-token cache file. Lazy `node:fs` import keeps the module leaf-light. Throws if the
 * file is missing or not schema-valid — but an EMPTY `entries` object is valid.
 */
export async function loadNativeTokenCache(path: string): Promise<NativeTokenCache> {
  const { readFileSync } = await import('node:fs')
  const raw = readFileSync(path, 'utf8')
  const parsed = JSON.parse(raw) as NativeTokenCache
  if (parsed.tokenizer !== 'fable-native' || parsed.method !== NATIVE_METHOD || typeof parsed.entries !== 'object') {
    throw new Error(`native token cache at ${path} is not schema-valid (tokenizer/method/entries)`)
  }
  return parsed
}

/** Memoised native loads, per cache path — the file read + crypto import is paid once per path. */
const nativeLoads = new Map<string, Promise<{ tokenizer: TokenCounter; cacheData: NativeTokenCache }>>()

/**
 * Resolve the native tokenizer AND the cache it reads (the cache is returned too so a renderer can
 * stamp `model`/`measured_at` and detect the empty state). Offline + deterministic.
 */
export function loadNativeTokenizer(path: string): Promise<{ tokenizer: TokenCounter; cacheData: NativeTokenCache }> {
  const hit = nativeLoads.get(path)
  if (hit) return hit
  const loading = (async () => {
    const [sha, cacheData] = await Promise.all([nativeSha256(), loadNativeTokenCache(path)])
    return { tokenizer: nativeTokenizer(cacheData, sha), cacheData }
  })()
  nativeLoads.set(path, loading)
  loading.catch(() => nativeLoads.delete(path))
  return loading
}
