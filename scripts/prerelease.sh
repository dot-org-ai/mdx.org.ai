#!/bin/bash
# Create a pre-release version
# Usage: ./scripts/prerelease.sh <tag>
# Example: ./scripts/prerelease.sh beta

set -e

TAG=${1:-beta}

if [[ ! "$TAG" =~ ^(alpha|beta|rc|next|canary)$ ]]; then
  echo "Usage: $0 <tag>"
  echo "Valid tags: alpha, beta, rc, next, canary"
  exit 1
fi

echo "=== Creating $TAG pre-release ==="

# Enter pre-release mode
pnpm changeset pre enter $TAG

echo ""
echo "Pre-release mode enabled with tag: $TAG"
echo ""
echo "Next steps:"
echo "1. Create changesets: pnpm changeset"
echo "2. Version packages:  pnpm changeset version"
echo "3. Publish:           pnpm changeset publish"
echo "4. Exit pre-release:  pnpm changeset pre exit"
