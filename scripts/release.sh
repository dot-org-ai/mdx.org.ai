#!/bin/bash
# Release workflow for mdx.org.ai monorepo
# Usage: ./scripts/release.sh [--dry-run]

set -e

DRY_RUN=""
if [ "$1" = "--dry-run" ]; then
  DRY_RUN="--dry-run"
  echo "Running in dry-run mode..."
fi

echo "=== mdx.org.ai Release Workflow ==="
echo ""

# 1. Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

# 2. Build all packages
echo "Building all packages..."
pnpm build

# 3. Run tests
echo "Running tests..."
pnpm test

# 4. Version packages based on changesets
echo "Versioning packages..."
pnpm changeset version

# 5. Show what will be published
echo ""
echo "Packages to publish:"
pnpm changeset status

# 6. Confirm
if [ -z "$DRY_RUN" ]; then
  echo ""
  read -p "Proceed with publishing? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# 7. Publish
echo "Publishing packages..."
pnpm changeset publish $DRY_RUN

# 8. Push tags
if [ -z "$DRY_RUN" ]; then
  echo "Pushing tags..."
  git push --follow-tags
fi

echo ""
echo "=== Release complete ==="
