# test/repo — repo-level guard suites

Suites here assert invariants of the **monorepo itself** (workspace layout,
dependency policy, tsconfig boundaries, README taxonomy), not of any one
package. Turbo only runs per-package scripts, so these need their own runner:

```bash
pnpm test:repo        # vitest run --config vitest.repo.config.ts
```

`pnpm test` and `pnpm test:unit` chain `test:repo`, and `.github/workflows/ci.yml`
runs it as its own step.

## Rules

- **One home.** Every `*.test.ts` guard lives in `test/repo/`. Do not put
  TypeScript guards under `tests/` — that directory holds the `.mdx` fixture
  suites run by `vitest.mdx.config.ts`, and nothing there is on a script path.
  `guard-test-home.test.ts` fails the build if a stray appears.
- **Resolve paths from `__dirname`** with `resolve(__dirname, '..', '..')` as
  the repo root; never rely on `process.cwd()`.
- **Name the issue** the guard protects (e.g. `mdx-8je.4`) in the file header
  so the next reader knows why the invariant exists.
- **Witness symbols, not source text.** When the invariant is "package X
  exports symbol Y", import Y: at runtime in a `*.test.ts`, and at the type
  level in a `*.test-d.ts` that tsc compiles through the vitest typecheck lane
  (`test/repo/tsconfig.json` scopes tsc to those files). A regex over a source
  file stays green while the export it pins is TS2305 (mdx-8je.29).
