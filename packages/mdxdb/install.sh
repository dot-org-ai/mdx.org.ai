#!/bin/sh
# mdxdb installer
# Run with: curl https://mdxdb.js.org/ | sh
#
# This installs mdxdb CLI - a single binary that includes:
# - MDX database CLI for managing content
# - Auto-downloads ClickHouse binary on first run
# - Works on macOS (arm64/x64) and Linux (arm64/x64)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# GitHub release URL
GITHUB_REPO="dot-org-ai/mdx.org.ai"
RELEASE_URL="https://github.com/${GITHUB_REPO}/releases/latest/download"

# Detect OS and architecture
detect_platform() {
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)

  case "$OS" in
    darwin)
      OS="darwin"
      ;;
    linux)
      OS="linux"
      ;;
    mingw*|msys*|cygwin*)
      OS="windows"
      ;;
    *)
      echo "${RED}Error: Unsupported OS: $OS${NC}"
      exit 1
      ;;
  esac

  case "$ARCH" in
    x86_64|amd64)
      ARCH="x64"
      ;;
    arm64|aarch64)
      ARCH="arm64"
      ;;
    *)
      echo "${RED}Error: Unsupported architecture: $ARCH${NC}"
      exit 1
      ;;
  esac

  PLATFORM="${OS}-${ARCH}"
}

# Get install directory
get_install_dir() {
  if [ -n "$MDXDB_INSTALL_DIR" ]; then
    INSTALL_DIR="$MDXDB_INSTALL_DIR"
  elif [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
    INSTALL_DIR="/usr/local/bin"
  elif [ -d "$HOME/.local/bin" ]; then
    INSTALL_DIR="$HOME/.local/bin"
  else
    INSTALL_DIR="$HOME/.mdx/bin"
    mkdir -p "$INSTALL_DIR"
  fi
}

# Download and install
install() {
  detect_platform
  get_install_dir

  BINARY_NAME="mdxdb-${PLATFORM}"
  if [ "$OS" = "windows" ]; then
    BINARY_NAME="${BINARY_NAME}.exe"
  fi

  DOWNLOAD_URL="${RELEASE_URL}/${BINARY_NAME}"
  TARGET="${INSTALL_DIR}/mdxdb"

  echo ""
  echo "${BLUE}mdxdb installer${NC}"
  echo ""
  echo "Platform:    ${PLATFORM}"
  echo "Install to:  ${TARGET}"
  echo ""

  # Check if already installed
  if [ -f "$TARGET" ]; then
    CURRENT_VERSION=$("$TARGET" version 2>/dev/null || echo "unknown")
    echo "${YELLOW}mdxdb is already installed (${CURRENT_VERSION})${NC}"
    echo -n "Reinstall? [y/N] "
    read -r REPLY
    if [ "$REPLY" != "y" ] && [ "$REPLY" != "Y" ]; then
      echo "Aborted."
      exit 0
    fi
  fi

  echo "Downloading ${BINARY_NAME}..."

  # Download
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$TARGET" "$DOWNLOAD_URL" || {
      echo "${RED}Download failed. Trying alternative method...${NC}"
      # Fallback: try npx
      echo "Installing via npm..."
      npm install -g mdxdb
      exit $?
    }
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$TARGET" "$DOWNLOAD_URL" || {
      echo "${RED}Download failed${NC}"
      exit 1
    }
  else
    echo "${RED}Error: Neither curl nor wget found${NC}"
    exit 1
  fi

  # Make executable
  chmod +x "$TARGET"

  # Verify installation
  if ! "$TARGET" version >/dev/null 2>&1; then
    echo "${RED}Error: Installation verification failed${NC}"
    rm -f "$TARGET"
    exit 1
  fi

  VERSION=$("$TARGET" version 2>/dev/null || echo "0.0.0")

  echo ""
  echo "${GREEN}✅ mdxdb ${VERSION} installed successfully!${NC}"
  echo ""

  # Check if install dir is in PATH
  case ":$PATH:" in
    *":${INSTALL_DIR}:"*)
      ;;
    *)
      echo "${YELLOW}Note: Add ${INSTALL_DIR} to your PATH:${NC}"
      echo ""
      case "$SHELL" in
        */zsh)
          echo "  echo 'export PATH=\"${INSTALL_DIR}:\$PATH\"' >> ~/.zshrc"
          ;;
        */bash)
          echo "  echo 'export PATH=\"${INSTALL_DIR}:\$PATH\"' >> ~/.bashrc"
          ;;
        *)
          echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
          ;;
      esac
      echo ""
      ;;
  esac

  echo "Get started:"
  echo ""
  echo "  ${BLUE}mdxdb${NC}              # Start local dev environment"
  echo "  ${BLUE}mdxdb --help${NC}       # Show all commands"
  echo "  ${BLUE}mdxdb publish${NC}      # Publish MDX files to database"
  echo ""
}

# Main
main() {
  # Check for uninstall flag
  if [ "$1" = "uninstall" ] || [ "$1" = "--uninstall" ]; then
    get_install_dir
    TARGET="${INSTALL_DIR}/mdxdb"
    if [ -f "$TARGET" ]; then
      rm -f "$TARGET"
      echo "${GREEN}mdxdb uninstalled${NC}"
    else
      echo "mdxdb is not installed in ${INSTALL_DIR}"
    fi
    exit 0
  fi

  install
}

main "$@"
