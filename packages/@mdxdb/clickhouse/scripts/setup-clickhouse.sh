#!/bin/bash
# Download and setup ClickHouse binary for local development
# Usage: ./scripts/setup-clickhouse.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$PACKAGE_DIR/.clickhouse"
BINARY="$BIN_DIR/clickhouse"

# Create bin directory
mkdir -p "$BIN_DIR"

# Check if already downloaded
if [ -f "$BINARY" ]; then
  echo "ClickHouse binary already exists at $BINARY"
  echo "Version: $($BINARY --version 2>/dev/null | head -1)"
  exit 0
fi

echo "Downloading ClickHouse binary..."
cd "$BIN_DIR"

# Download using ClickHouse's official installer
curl -fsSL https://clickhouse.com/ | sh

# Make executable
chmod +x clickhouse

echo ""
echo "ClickHouse installed to: $BINARY"
echo "Version: $($BINARY --version 2>/dev/null | head -1)"
echo ""
echo "To start the server:"
echo "  pnpm clickhouse:server"
echo ""
echo "To run queries:"
echo "  pnpm clickhouse:client"
