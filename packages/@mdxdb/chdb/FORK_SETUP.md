# Setting Up @mdxdb/chdb Forks

This guide walks through setting up the forked chdb repositories with vector search support.

## Overview

We need two forks:
1. **chdb** (core library) - Add `ENABLE_USEARCH=1` build flag
2. **chdb-node** (Node.js bindings) - Point to our built library

## Step 1: Fork the Repositories

### Using GitHub CLI:

```bash
# Fork chdb core library
gh repo fork chdb-io/chdb --org mdxdb --clone=false

# Fork chdb-node
gh repo fork chdb-io/chdb-node --org mdxdb --clone=false
```

### Or manually:
1. Go to https://github.com/chdb-io/chdb → Fork → Select `mdxdb` org
2. Go to https://github.com/chdb-io/chdb-node → Fork → Select `mdxdb` org

## Step 2: Clone and Patch chdb Core

```bash
# Clone the fork
git clone https://github.com/mdxdb/chdb.git /tmp/chdb-fork
cd /tmp/chdb-fork

# Create a branch for our changes
git checkout -b vector-support

# Apply the patch
git apply /path/to/mdx.org.ai/packages/@mdxdb/chdb/patches/chdb-vector.patch

# Commit and push
git add -A
git commit -m "feat: enable vector similarity and ULID support

- Add ENABLE_USEARCH=1 to CMAKE_ARGS
- Enables vector_similarity index type
- Enables generateULID() function"

git push origin vector-support

# Create PR or merge to main
gh pr create --title "Enable vector similarity support" --body "Adds ENABLE_USEARCH=1 flag for vector search"
```

## Step 3: Update GitHub Actions Secrets

In your GitHub repository settings, add:

- `NPM_TOKEN` - npm publish token with write access

## Step 4: Trigger Build

Push to main branch or manually trigger the workflow:

```bash
gh workflow run build.yml
```

## Verifying the Build

After build completes, test locally:

```bash
npm install @mdxdb/chdb

node -e "
const { Session, hasVectorSearch, hasULID } = require('@mdxdb/chdb')
console.log('Vector Search:', hasVectorSearch())
console.log('ULID:', hasULID())
"
```

Expected output:
```
Vector Search: true
ULID: true
```

## Syncing with Upstream

To pull updates from upstream chdb:

```bash
cd /path/to/chdb-fork
git fetch upstream
git merge upstream/main
# Resolve any conflicts in build.sh
git push origin main
```

## Build Matrix

The CI builds for:
| Platform | Architecture | Runner | Status |
|----------|--------------|--------|--------|
| Linux | x86_64 | ubuntu-22.04 | ✅ |
| macOS | x86_64 (Intel) | macos-13 | ✅ |
| macOS | ARM64 (Apple Silicon) | macos-14 | ✅ |

> **Note:** Linux ARM64 can be added later using QEMU emulation if needed.

## Quick Start Commands

```bash
# Forks already created at:
# - https://github.com/ai-primitives/chdb
# - https://github.com/ai-primitives/chdb-node

# The vector support patch has been applied to ai-primitives/chdb
# Adds: -DENABLE_USEARCH=1 -DENABLE_ANNOY=1 to CMAKE_ARGS

# To trigger the build workflow:
gh workflow run chdb-build.yml -f skip_cache=true
```
