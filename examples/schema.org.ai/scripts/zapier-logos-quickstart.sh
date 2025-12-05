#!/bin/bash
# Zapier Logos Quick Start
# Helper script to run common logo download tasks

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOGO_DIR="/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier"

echo "🚀 Zapier Logos Quick Start"
echo ""
echo "Available commands:"
echo "  1) Test download (priority only, 16 logos)"
echo "  2) Discover URLs (SimpleIcons matching)"
echo "  3) Full download (all discovered URLs)"
echo "  4) Show statistics"
echo "  5) Clean downloads (remove all logos)"
echo "  q) Quit"
echo ""

read -p "Select option: " option

case $option in
  1)
    echo ""
    echo "📥 Testing download with priority services..."
    echo "This will download ~16 logos with known URLs"
    echo ""
    read -p "Continue? (y/N): " confirm
    if [[ $confirm == [yY] ]]; then
      cd "$SCRIPT_DIR"
      ./download-zapier-logos.ts --priority-only --batch-size=10
      echo ""
      echo "✅ Test complete! Check: $LOGO_DIR/priority/"
    fi
    ;;

  2)
    echo ""
    echo "🔍 Discovering logo URLs..."
    echo "This will attempt to find URLs for services without them"
    echo ""
    read -p "Continue? (y/N): " confirm
    if [[ $confirm == [yY] ]]; then
      cd "$SCRIPT_DIR"
      ./discover-zapier-logo-urls.ts --method=all
      echo ""
      echo "✅ Discovery complete! Check: $LOGO_DIR/discovered-urls.json"
    fi
    ;;

  3)
    echo ""
    echo "📥 Full logo download..."
    echo "This will download all logos with discovered URLs"
    echo "Estimated time: 2-4 hours"
    echo "Estimated size: 150-300 MB"
    echo ""
    read -p "Continue? (y/N): " confirm
    if [[ $confirm == [yY] ]]; then
      cd "$SCRIPT_DIR"
      read -p "Batch size (default 50): " batch
      batch=${batch:-50}
      read -p "Rate limit ms (default 100): " rate
      rate=${rate:-100}
      ./download-zapier-logos.ts --batch-size=$batch --rate-limit=$rate
      echo ""
      echo "✅ Download complete! Check: $LOGO_DIR/"
    fi
    ;;

  4)
    echo ""
    echo "📊 Statistics"
    echo ""

    if [ -f "$LOGO_DIR/manifest.json" ]; then
      echo "From manifest.json:"
      cat "$LOGO_DIR/manifest.json" | jq '{
        downloaded,
        totalServices,
        successfulDownloads,
        failed,
        priorityDownloads,
        estimatedSize
      }'
    else
      echo "No manifest.json found yet"
    fi

    echo ""
    echo "Current directories:"
    echo "  Priority logos: $(ls -1 $LOGO_DIR/priority/*.png 2>/dev/null | wc -l) files"
    echo "  All logos: $(ls -1 $LOGO_DIR/all/*.png 2>/dev/null | wc -l) files"

    if [ -f "$LOGO_DIR/discovered-urls.json" ]; then
      echo ""
      echo "From discovered-urls.json:"
      cat "$LOGO_DIR/discovered-urls.json" | jq '{
        totalServices,
        servicesWithUrls,
        servicesNeedingUrls,
        methods
      }'
    fi
    ;;

  5)
    echo ""
    echo "🗑️  Clean all downloaded logos"
    echo "This will remove all .png files from priority/ and all/"
    echo ""
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm == [yY] ]]; then
      rm -f "$LOGO_DIR/priority"/*.png 2>/dev/null || true
      rm -f "$LOGO_DIR/all"/*.png 2>/dev/null || true
      rm -f "$LOGO_DIR/manifest.json" 2>/dev/null || true
      echo "✅ Cleaned!"
    fi
    ;;

  q|Q)
    echo "Goodbye!"
    exit 0
    ;;

  *)
    echo "Invalid option"
    exit 1
    ;;
esac

echo ""
echo "Done!"
