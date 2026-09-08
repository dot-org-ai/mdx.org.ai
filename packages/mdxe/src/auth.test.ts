/**
 * Guards against oauth.do export drift.
 *
 * oauth.do's root entry has shipped `ensureLoggedIn` under a mangled name
 * (`e`) in its .d.ts and omitted it from the runtime ESM bundle entirely.
 * mdxe therefore routes every oauth.do import through src/auth.ts, which
 * reads from the `oauth.do/node` subpath. If upstream drifts again, this
 * is the test that goes red first.
 */

import { describe, it, expect } from 'vitest'
import { ensureLoggedIn, getToken } from './auth.js'

describe('mdxe/auth (oauth.do wrapper)', () => {
  it('re-exports ensureLoggedIn as a callable function', () => {
    expect(typeof ensureLoggedIn).toBe('function')
  })

  it('re-exports getToken as a callable function', () => {
    expect(typeof getToken).toBe('function')
  })
})
