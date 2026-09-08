import { defineConfig } from 'vitest/config'

/**
 * Repo-level invariants (workspace layout, dependency policy, docs taxonomy,
 * tsconfig boundaries). These guard the shape of the monorepo, not any one
 * package, so no turbo task ever runs them — they need their own config.
 *
 * Canonical home: test/repo/**\/*.test.ts (see test/repo/README.md).
 *
 * Run with `pnpm test:repo`; chained into `pnpm test` and `pnpm test:unit`,
 * and run as its own step in .github/workflows/ci.yml.
 *
 * `tests/**\/*.test.ts` is swept as well so that a guard suite dropped into
 * the (plural) mdx-fixture directory by mistake still executes instead of
 * silently going dark; test/repo/guard-test-home.test.ts then fails with a
 * pointer to the canonical location.
 *
 * test/repo/**\/*.test-d.ts are type-level guards compiled by tsc through the
 * vitest typecheck lane (test/repo/tsconfig.json scopes tsc to those files).
 * Use one when the invariant is "this symbol exists in that package" - a
 * source-text regex cannot go red for a missing export (mdx-8je.29).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/repo/**/*.test.ts', 'tests/**/*.test.ts'],
    typecheck: {
      enabled: true,
      include: ['test/repo/**/*.test-d.ts'],
      tsconfig: 'test/repo/tsconfig.json',
    },
  },
})
