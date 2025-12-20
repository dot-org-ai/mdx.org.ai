#!/bin/bash
# Publish primitives packages to npm in correct order
# Run this from the mdx.org.ai root directory
#
# Usage:
#   ./scripts/publish-primitives.sh           # Publish all
#   ./scripts/publish-primitives.sh --dry-run # Dry run

set -e

DRY_RUN=""
if [ "$1" = "--dry-run" ]; then
  DRY_RUN="--dry-run"
  echo "Running in dry-run mode..."
fi

PRIMITIVES_DIR="./primitives"

# Packages in publish order (dependencies first)
PACKAGES=(
  "language-models"
  "ai-workflows"
  "ai-providers"
  "ai-functions"
  "ai-database"
  "ai-evaluate"
)

echo "=== Publishing Primitives Packages ==="
echo ""

cd "$PRIMITIVES_DIR"

# Build all first
echo "Building all packages..."
pnpm build

for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="packages/$pkg"

  if [ ! -d "$PKG_DIR" ]; then
    echo "SKIP: $pkg (directory not found)"
    continue
  fi

  cd "$PKG_DIR"

  PKG_NAME=$(node -p "require('./package.json').name")
  PKG_VERSION=$(node -p "require('./package.json').version")
  NPM_VERSION=$(npm view "$PKG_NAME" version 2>/dev/null || echo "")

  if [ "$NPM_VERSION" = "$PKG_VERSION" ]; then
    echo "SKIP: $PKG_NAME@$PKG_VERSION (already published)"
  else
    echo ""
    echo "Publishing $PKG_NAME@$PKG_VERSION..."

    if [ -n "$DRY_RUN" ]; then
      echo "  [DRY RUN] Would run: npm publish --access public"
    else
      npm publish --access public
      echo "  ✓ Published $PKG_NAME@$PKG_VERSION"
    fi
  fi

  cd ../..
done

cd ..

echo ""
echo "=== Primitives Publishing Complete ==="
echo ""
echo "Next steps:"
echo "  1. Update mdxe/package.json file: references to npm versions"
echo "  2. Run: pnpm publish:all to publish mdx.org.ai packages"
