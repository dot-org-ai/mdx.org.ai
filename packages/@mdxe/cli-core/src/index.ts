/**
 * # @mdxe/cli-core — the leaf home of the resolvers mdxe's faces share
 *
 * The CLI (`mdxe`) and the HTTP faces (`@mdxe/hono`, mdx-8je.18) must resolve their output format
 * from ONE ladder and stamp token costs from ONE labelled oracle. `mdxe` depends on `@mdxe/hono`, so
 * these modules cannot live in `mdxe` without a cycle (mdx-8je.26) — they live here, a leaf that
 * imports only node built-ins (lazily, off the hot path) and that both packages depend on.
 *
 *   - `context`  — {@link resolveOutputCtx}: `--json`/`--format` > `Accept` > agent env > CI > pipe >
 *                  TTY; {@link modeFromAccept} is the `Accept` rung an HTTP face reuses.
 *   - `caller`   — {@link resolveCaller}: env-beats-TTY agent detection, fail-closed to non-interactive.
 *   - `errors`   — {@link CliError} + the stable {@link EXIT} map; {@link fail} renders to stderr only.
 *   - `tokens`   — the labelled token-count oracle backing `x-markdown-tokens`.
 *
 * Standing constraint (pinned by `tests/leaf.test.ts`): every module here statically imports only
 * its siblings; node built-ins are reached through lazy `await import(...)`.
 */

export {
  resolveOutputCtx,
  resolveFromProcess,
  modeFromAccept,
  FAILSAFE_CTX,
  RENDER_MODES,
  type OutputCtx,
  type RenderMode,
  type GlobalFlags,
  type Env,
  type Streams,
} from './context.js'

export {
  resolveCaller,
  resolveCallerFromProcess,
  detectAgentEnv,
  detectCI,
  AGENT_ENV_MARKERS,
  AGENT_ENV_PREFIX,
  CI_MARKERS,
  CALLER_KINDS,
  CALLER_DETECTIONS,
  type Caller,
  type CallerKind,
  type CallerDetection,
} from './caller.js'

export {
  CliError,
  EXIT,
  fail,
  usageError,
  notFoundError,
  refusedError,
  runtimeUnavailableError,
  asConnectionError,
  type ProblemDetails,
  type ErrorSink,
  type ErrorEnvelope,
} from './errors.js'

export {
  loadTokenizer,
  countTokens,
  approxTokenizer,
  nativeTokenizer,
  nativeSha256,
  loadNativeTokenCache,
  loadNativeTokenizer,
  isNativeCacheEmpty,
  NativeTokenCacheMissError,
  NativeTokenCacheBaseDriftError,
  NATIVE_MODEL,
  NATIVE_METHOD,
  NATIVE_ENDPOINT,
  NATIVE_DIFF_BASE,
  NATIVE_REFRESH_HINT,
  CHARS_PER_TOKEN,
  type TokenizerId,
  type CountMethod,
  type TokenCount,
  type TokenCounter,
  type NativeTokenCache,
  type NativeTokenCacheEntry,
} from './tokens.js'
