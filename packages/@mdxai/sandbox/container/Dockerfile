# Claude Code Sandbox Container
# Base image for running Claude Code CLI in Cloudflare Sandbox

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@latest

# Install Claude Code CLI globally
# Note: Replace with actual package name when available
RUN pnpm add -g @anthropic-ai/claude-code || \
    echo "Warning: @anthropic-ai/claude-code not yet published"

# Set up workspace directory
WORKDIR /workspace

# Copy and set up entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set default environment variables
ENV NODE_ENV=production
ENV PNPM_HOME=/usr/local/bin
ENV PATH="${PNPM_HOME}:${PATH}"

# Configure git to allow operations in any directory
# This is needed for Claude Code to work with git repos
RUN git config --global --add safe.directory '*'

# Set git identity for commits (Claude Code may need this)
RUN git config --global user.name "Claude Agent" && \
    git config --global user.email "agent@claude.ai"

ENTRYPOINT ["/entrypoint.sh"]
