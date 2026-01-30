#!/bin/bash
# Publish mdx.org.ai packages to npm in correct order
# Usage: ./scripts/publish-mdx.sh

set -e

# Packages in publish order (dependencies first)
PACKAGES=(
  "packages/mdxld"
  "packages/@mdxld/types"
  "packages/@mdxld/remark"
  "packages/@mdxld/markdown"
  "packages/@mdxld/extract"
  "packages/@mdxld/jsx"
  "packages/@mdxld/ast"
  "packages/@mdxld/compile"
  "packages/@mdxe/cloudflare"
  "packages/@mdxe/do"
  "packages/@mdxe/github"
  "packages/@mdxe/vercel"
  "packages/@mdxdb/sqlite"
  "packages/@mdxe/fumadocs"
  "packages/@mdxdb/fs"
  "packages/@mdxe/deploy"
  "packages/@mdxdb/fumadocs"
  "packages/@mdxdb/clickhouse"
  "packages/@mdxui/fumadocs"
  "packages/@mdxdb/payload"
  "packages/@mdxe/hono"
  "packages/@mdxe/payload"
  "packages/mdxe"
)

echo "=== Publishing MDX.org.ai Packages ==="
echo ""

for pkg_path in "${PACKAGES[@]}"; do
  if [ ! -d "$pkg_path" ]; then
    echo "SKIP: $pkg_path (not found)"
    continue
  fi

  cd "$pkg_path"

  PKG_NAME=$(node -p "require('./package.json').name")
  PKG_VERSION=$(node -p "require('./package.json').version")
  NPM_VERSION=$(npm view "$PKG_NAME" version 2>/dev/null || echo "")

  if [ "$NPM_VERSION" = "$PKG_VERSION" ]; then
    echo "SKIP: $PKG_NAME@$PKG_VERSION (already published)"
  else
    echo ""
    echo "Building $PKG_NAME..."
    pnpm build || { echo "Build failed, skipping"; cd - > /dev/null; continue; }
    echo "Publishing $PKG_NAME@$PKG_VERSION..."
    pnpm publish --access public --no-git-checks
    echo "✓ Published $PKG_NAME@$PKG_VERSION"
  fi

  cd - > /dev/null
done

echo ""
echo "=== Publishing Complete ==="
