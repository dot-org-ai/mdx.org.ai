#!/bin/bash
set -e

# Entrypoint script for Claude Code sandbox container
# This script handles initialization and command execution

# Print environment info for debugging
echo "=== Claude Code Sandbox ==="
echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version)"
echo "Git version: $(git --version)"
echo "Working directory: $(pwd)"
echo "=========================="

# Validate required environment variables
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Warning: ANTHROPIC_API_KEY not set"
fi

# If no command specified, run bash for interactive debugging
if [ $# -eq 0 ]; then
    echo "No command specified, starting interactive shell"
    exec /bin/bash
fi

# Execute the provided command
exec "$@"
