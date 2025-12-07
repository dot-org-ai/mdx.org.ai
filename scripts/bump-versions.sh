#!/bin/bash
# Bump all package versions in the monorepo
# Usage: ./scripts/bump-versions.sh 2.0.0

set -e

VERSION=${1:-}

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 2.0.0"
  exit 1
fi

# Validate semver format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: Invalid semver format. Use X.Y.Z or X.Y.Z-tag"
  exit 1
fi

echo "Bumping all packages to version $VERSION..."

# Update all package.json files in packages/
find packages -name "package.json" -not -path "*/node_modules/*" -exec sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" {} \;

# Count updated packages
count=$(find packages -name "package.json" -not -path "*/node_modules/*" | wc -l | tr -d ' ')

echo "✓ Updated $count packages to $VERSION"

# Show a sample
echo ""
echo "Sample versions:"
find packages -name "package.json" -not -path "*/node_modules/*" | head -5 | xargs grep '"version"'
