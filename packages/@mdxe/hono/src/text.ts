/**
 * # @mdxe/hono `text` — the text registers on the HTTP face (mdx-8je.18)
 *
 * `Accept: text/markdown` is the agent register (Cloudflare's Markdown-for-Agents convention) and
 * `Accept: text/plain` the plain one. Both are rendered by `@mdxui/text` — the SAME renderer the
 * mdxe CLI's `--format md|plain` uses — so the bytes a served page emits are byte-identical to the
 * bytes the CLI emits for the same document. This module is the HTTP flavor of that ladder:
 *
 *   - {@link resolveTextRegister}: the `Accept` rung, via `resolveCapabilities({ accept })` from
 *     `@mdxui/text/capabilities`. `text/markdown` → `md`, `text/plain` → `plain`; wildcards,
 *     `text/html` and `application/json` name no text register and return `null` here — whether to
 *     serve them another way or answer 406 is `./format.ts`'s decision, never a silent downgrade.
 *   - {@link renderTextRegister}: the bytes, from `@mdxui/text/core` `render(doc, capabilities)`.
 *   - {@link textRegisterHeaders}: `Content-Type: text/markdown; charset=utf-8` (or `text/plain`),
 *     `Vary: Accept`, and on the md register `x-markdown-tokens` — a LABELLED count from the
 *     `@mdxe/cli-core` token oracle, with the method that produced it in `x-markdown-tokens-method`,
 *     so an agent can never mistake a `chars-approx` estimate for a precise BPE count.
 *   - {@link notAcceptable}: the fail-closed 406 — a `problem+json` body that NAMES the media types
 *     this face serves. An `Accept` that names only formats we do not implement is refused, never
 *     downgraded to something the client did not ask for.
 *
 * Caller for an Accept-decided request: `detectedBy: 'accept'`, `kind: 'agent'` for md / `'human'`
 * for plain, `harness: null`, never interactive — the resolver's verdict, carried on the context.
 */

import type { MDXLDDocument } from 'mdxld'
import { resolveCapabilities, type Capabilities, type Register } from '@mdxui/text/capabilities'
import { render } from '@mdxui/text/core'
import { countTokens, type TokenCount, type TokenizerId } from '@mdxe/cli-core/tokens'
import type { ProblemDetails } from '@mdxe/cli-core/errors'

/** The two registers the HTTP face serves by negotiation. `ascii`/`unicode`/`ansi` are terminal
 *  skins: a TTY concern, never an HTTP one. */
export type TextRegister = 'md' | 'plain'
export const TEXT_REGISTERS = ['md', 'plain'] as const satisfies readonly TextRegister[]

/** Media type each register is served as. `charset=utf-8` is part of the convention. */
export const TEXT_REGISTER_CONTENT_TYPES: Readonly<Record<TextRegister, string>> = Object.freeze({
  md: 'text/markdown; charset=utf-8',
  plain: 'text/plain; charset=utf-8',
})

/** Media type → register: the inverse of {@link TEXT_REGISTER_CONTENT_TYPES}, parameter-free. */
export const TEXT_REGISTER_MEDIA_TYPES: Readonly<Record<string, TextRegister>> = Object.freeze({
  'text/markdown': 'md',
  'text/plain': 'plain',
})

/** The header carrying the token count of a markdown response (Cloudflare Markdown-for-Agents). */
export const TOKENS_HEADER = 'x-markdown-tokens'
/** The header labelling HOW that count was produced — the anti-fake-precise guarantee on the wire. */
export const TOKENS_METHOD_HEADER = 'x-markdown-tokens-method'

/** The tokenizer the header counts under unless the server chooses another. */
export const DEFAULT_TOKENIZER: TokenizerId = 'o200k_base'

export function isTextRegister(register: Register | string | null | undefined): register is TextRegister {
  return register === 'md' || register === 'plain'
}

/**
 * The text register an `Accept` header asks for, with the frozen capabilities the render reads —
 * or `null` when `Accept` names no text register (absent, wildcards only, `text/html`,
 * `application/json`, every text type at `q=0`). Delegates to the ONE ladder in
 * `@mdxui/text/capabilities`; only an `Accept`-decided result is returned (`caller.detectedBy ===
 * 'accept'`) so an env/TTY rung can never leak onto the HTTP face.
 */
export function resolveTextRegister(accept: string | undefined): { register: TextRegister; capabilities: Capabilities } | null {
  if (accept === undefined || accept.trim() === '') return null
  const capabilities = resolveCapabilities({ accept })
  if (capabilities.caller.detectedBy !== 'accept') return null
  if (!isTextRegister(capabilities.register)) return null
  return { register: capabilities.register, capabilities }
}

/**
 * The capabilities for a register decided by something other than `Accept` — a `.md`/`.txt` URL
 * extension is the HTTP flavor of the CLI's `--format` flag, and resolves through the same rung
 * (`caller.detectedBy === 'flag'`, never interactive).
 */
export function capabilitiesForRegister(register: TextRegister): Capabilities {
  return resolveCapabilities({ flags: { format: register } })
}

/**
 * Render a document to a text register's bytes. The `target` is the frozen `Capabilities` a
 * request resolved (preferred — the same object the CLI would thread) or a bare register name.
 */
export function renderTextRegister(doc: MDXLDDocument, target: Capabilities | TextRegister): string {
  return render(doc, target)
}

/** A labelled token count of a rendered body. Never throws for the open tokenizers: an absent
 *  precise backend degrades to the LABELLED `chars-approx`, which the method header then says. */
export async function countRegisterTokens(body: string, tokenizer: TokenizerId = DEFAULT_TOKENIZER): Promise<TokenCount> {
  return countTokens(body, tokenizer)
}

/** The wire form of a labelled count: `<method>; tokenizer=<id>`. */
export function formatTokensMethod(count: TokenCount): string {
  return `${count.method}; tokenizer=${count.tokenizer}`
}

export interface TextRegisterHeaderOptions {
  /** Stamp `Vary: Accept` (the response was negotiated). Default true. */
  readonly vary?: boolean
  /** Tokenizer for `x-markdown-tokens`. Default {@link DEFAULT_TOKENIZER}. */
  readonly tokenizer?: TokenizerId
}

/**
 * The headers a text-register response carries. `x-markdown-tokens` (+ its method label) is stamped
 * on the md register only — the header is the markdown convention, and an unlabelled or misnamed
 * count is worse than none.
 */
export async function textRegisterHeaders(
  register: TextRegister,
  body: string,
  options: TextRegisterHeaderOptions = {},
): Promise<Headers> {
  const headers = new Headers({ 'Content-Type': TEXT_REGISTER_CONTENT_TYPES[register] })
  if (options.vary !== false) headers.set('Vary', 'Accept')
  if (register === 'md') {
    const count = await countRegisterTokens(body, options.tokenizer)
    headers.set(TOKENS_HEADER, String(count.count))
    headers.set(TOKENS_METHOD_HEADER, formatTokensMethod(count))
  }
  return headers
}

/** Render + stamp: the complete text-register response for a document. */
export async function textRegisterResponse(
  doc: MDXLDDocument,
  target: Capabilities | TextRegister,
  options: TextRegisterHeaderOptions = {},
): Promise<Response> {
  const register = typeof target === 'string' ? target : target.register
  if (!isTextRegister(register)) {
    throw new Error(`textRegisterResponse: '${register}' is not a text register the HTTP face serves (md|plain)`)
  }
  const body = renderTextRegister(doc, target)
  const headers = await textRegisterHeaders(register, body, options)
  return new Response(body, { status: 200, headers })
}

/** The problem+json body of a 406 — RFC 9457 fields plus the machine-readable `available` list. */
export interface NotAcceptableProblem extends ProblemDetails {
  readonly type: 'https://mdx.org.ai/problems/not-acceptable'
  readonly title: 'Not Acceptable'
  readonly status: 406
  readonly code: 'FORMAT'
  readonly detail: string
  /** The `Accept` value that was refused (verbatim). */
  readonly accept: string
  /** The media types this face serves — what the client can ask for instead. */
  readonly available: readonly string[]
}

/** Build the 406 problem for a refused `Accept`. Pure: no I/O, so the body is testable as data. */
export function notAcceptableProblem(accept: string, available: readonly string[]): NotAcceptableProblem {
  return {
    type: 'https://mdx.org.ai/problems/not-acceptable',
    title: 'Not Acceptable',
    status: 406,
    code: 'FORMAT',
    detail: `Accept ${JSON.stringify(accept)} names no format this server implements; available: ${available.join(', ')}`,
    accept,
    available,
  }
}

/**
 * The fail-closed answer to an `Accept` that names only formats this face does not implement:
 * `406 Not Acceptable`, `application/problem+json`, naming every media type that exists. Never a
 * silent downgrade — a client that asked for `text/csv` is told what it CAN have, not handed HTML.
 */
export function notAcceptable(accept: string, available: readonly string[]): Response {
  const problem = notAcceptableProblem(accept, available)
  return new Response(JSON.stringify(problem, null, 2), {
    status: 406,
    headers: {
      'Content-Type': 'application/problem+json; charset=utf-8',
      Vary: 'Accept',
    },
  })
}

export type { Capabilities, Register, TokenCount, TokenizerId }
