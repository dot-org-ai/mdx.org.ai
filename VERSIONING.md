# Versioning Strategy

This document describes the versioning strategy for the mdx.org.ai monorepo.

## Semantic Versioning

All packages follow [Semantic Versioning](https://semver.org/):

| Bump | When | Example |
|------|------|---------|
| **Major (X.0.0)** | Breaking API changes | Removing exports, changing function signatures, changing default behavior |
| **Minor (X.Y.0)** | New features (backwards compatible) | New components, new adapters, new options |
| **Patch (X.Y.Z)** | Bug fixes | Fixing edge cases, documentation, types |

## Package Layers

The monorepo is organized into layers with different stability expectations:

```
Layer        Packages           Stability    Release Cadence
───────────────────────────────────────────────────────────────
Foundation   mdxld, @mdxld/*    Very High    Quarterly
Storage      mdxdb, @mdxdb/*    High         Monthly
Execution    mdxe, @mdxe/*      Moderate     Bi-weekly
Rendering    mdxui, @mdxui/*    Active       Weekly
AI           mdxai, @mdxai/*    Active       Weekly
```

### Layer Descriptions

- **mdxld** (Foundation): Core parsing, YAML-LD, types. Changes rarely, high stability.
- **mdxdb** (Storage): Database adapters. Moderate changes as new backends are added.
- **mdxe** (Execution): Runtime environments. Changes as platforms evolve.
- **mdxui** (Rendering): UI components. Most active, frequent additions and updates.
- **mdxai** (AI): AI integrations. Active development, AI ecosystem moves fast.

## Linked Versioning

Packages within each scope are **linked** - they bump together:

```
mdxld  + @mdxld/*   → All bump together
mdxdb  + @mdxdb/*   → All bump together
mdxe   + @mdxe/*    → All bump together
mdxui  + @mdxui/*   → All bump together
mdxai  + @mdxai/*   → All bump together
```

**Scopes are independent.** A change to `@mdxui/chat` bumps all `@mdxui/*` packages but does NOT affect `@mdxld/*` packages.

This means over time:
- `mdxld` might stay at `2.2.0` (stable)
- `mdxui` might reach `2.50.0` (very active)

## Version Ranges

When depending on packages, use appropriate ranges:

```json
{
  "dependencies": {
    "mdxld": "^2.0.0",         // Wide range - stable package
    "@mdxui/chat": "^2.0.0"    // Will update with UI changes
  },
  "peerDependencies": {
    "mdxld": "^2.0.0"          // Allow user to control version
  }
}
```

## Creating Releases

### 1. Create a Changeset

When you make changes, create a changeset:

```bash
pnpm changeset
```

Select the packages you changed and describe the changes.

### 2. Version Packages

Before releasing, bump versions based on changesets:

```bash
pnpm changeset version
```

This updates package.json files and generates CHANGELOG entries.

### 3. Publish

```bash
pnpm release
```

## Manual Version Bumps

For coordinated releases (like initial 2.0.0), use the bump script:

```bash
# Bump all packages to a specific version
./scripts/bump-versions.sh 2.0.0

# Pre-release versions
./scripts/bump-versions.sh 2.0.0-beta.1
./scripts/bump-versions.sh 2.0.0-rc.1
```

## Pre-release Strategy

| Tag | Purpose | Example |
|-----|---------|---------|
| `alpha` | Early development, breaking changes expected | `2.0.0-alpha.1` |
| `beta` | Feature complete, testing | `2.0.0-beta.1` |
| `rc` | Release candidate, final testing | `2.0.0-rc.1` |

## Changeset Configuration

Configuration is in `.changeset/config.json`:

```json
{
  "linked": [
    ["mdxld", "@mdxld/*"],
    ["mdxdb", "@mdxdb/*"],
    ["mdxe", "@mdxe/*"],
    ["mdxui", "@mdxui/*"],
    ["mdxai", "@mdxai/*"]
  ],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

## Examples

### Scenario: Add new @mdxui/newpkg component

1. Create the package
2. Run `pnpm changeset`
3. Select `@mdxui/newpkg` and mark as `minor`
4. All `@mdxui/*` packages get a minor bump together

### Scenario: Fix bug in mdxld parser

1. Fix the bug
2. Run `pnpm changeset`
3. Select `mdxld` and mark as `patch`
4. All `@mdxld/*` packages get a patch bump together
5. Other scopes (mdxui, mdxe, etc.) are NOT affected

### Scenario: Breaking change in @mdxdb/fs

1. Make the breaking change
2. Run `pnpm changeset`
3. Select `@mdxdb/fs` and mark as `major`
4. All `@mdxdb/*` packages get a major bump together
5. Other scopes are NOT affected
