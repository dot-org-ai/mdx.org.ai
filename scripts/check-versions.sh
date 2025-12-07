#!/bin/bash
# Check current versions of all packages (local and npm)
# Usage: ./scripts/check-versions.sh

set -e

echo "Package|Local|NPM|Status"
echo "-------|-----|---|------"

for pkg_json in $(find packages -name "package.json" -not -path "*/node_modules/*" | sort); do
  pkg=$(jq -r '.name' "$pkg_json" 2>/dev/null)
  local_ver=$(jq -r '.version' "$pkg_json" 2>/dev/null)

  if [ -n "$pkg" ] && [ "$pkg" != "null" ]; then
    npm_ver=$(npm view "$pkg" version 2>/dev/null || echo "-")

    if [ "$npm_ver" = "-" ]; then
      status="unpublished"
    elif [ "$local_ver" = "$npm_ver" ]; then
      status="current"
    else
      status="outdated"
    fi

    echo "$pkg|$local_ver|$npm_ver|$status"
  fi
done | column -t -s'|'
