/**
 * Single import site for oauth.do inside mdxe.
 *
 * Why this file exists: oauth.do's root entry (`oauth.do`) ships a
 * tsup-mangled declaration file that exports `ensureLoggedIn as e`
 * (TS2460 / TS2339 for anyone importing `{ ensureLoggedIn }`), and its
 * runtime ESM bundle does not export `ensureLoggedIn` at all. Only the
 * `oauth.do/node` subpath re-exports the symbol under its real name, for
 * both types and runtime. This is true of every published 0.1.x and 0.2.x
 * build, so pinning does not help.
 *
 * Every oauth.do consumer in mdxe imports from here, so a future drift in
 * the upstream export shape is caught by one unit test (auth.test.ts)
 * instead of five build failures.
 *
 * @packageDocumentation
 */

export {
  ensureLoggedIn,
  getToken,
  type LoginOptions,
  type LoginResult,
} from 'oauth.do/node'
