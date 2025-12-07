#!/bin/bash

# Get all package names from the monorepo
packages=$(find packages -name "package.json" -not -path "*/node_modules/*" | xargs -I{} jq -r '.name' {} 2>/dev/null | sort)

echo "Package,Published,Latest Version,Local Version"
echo "-------,--------,--------------,-------------"

for pkg in $packages; do
  if [ -n "$pkg" ] && [ "$pkg" != "null" ]; then
    # Get local version
    local_version=$(find packages -name "package.json" -not -path "*/node_modules/*" -exec grep -l "\"name\": \"$pkg\"" {} \; | head -1 | xargs jq -r '.version' 2>/dev/null)
    
    # Check npm for published version
    npm_info=$(npm view "$pkg" version 2>/dev/null)
    
    if [ -n "$npm_info" ]; then
      echo "$pkg,Yes,$npm_info,$local_version"
    else
      echo "$pkg,No,-,$local_version"
    fi
  fi
done
