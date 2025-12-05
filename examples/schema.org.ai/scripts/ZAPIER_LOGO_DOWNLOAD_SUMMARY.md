# Zapier Logo Download Script - Summary

## Overview

Created a comprehensive script system to download Zapier service logos (PNGs) from the Zapier CDN.

## Files Created

### 1. Main Download Script
**Location:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/download-zapier-logos.ts`

**Features:**
- Downloads PNG logos from Zapier CDN
- TitleCase naming: `google-sheets` → `GoogleSheets.png`
- Rate limiting (configurable)
- Resume capability (skips existing)
- Priority-based downloading
- Automatic retry on failures (up to 3 attempts)
- Timeout protection (30 seconds)
- Progress tracking with size information
- Manifest generation with metadata

**Usage:**
```bash
# Download all logos (default)
./download-zapier-logos.ts

# Priority services only (top 100)
./download-zapier-logos.ts --priority-only

# Custom settings
./download-zapier-logos.ts --batch-size=25 --rate-limit=200
```

**Parameters:**
- `--batch-size=N` - Download N logos per batch (default: 50)
- `--rate-limit=MS` - Wait MS milliseconds between batches (default: 100)
- `--priority-only` - Only download priority services

### 2. URL Discovery Script
**Location:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/discover-zapier-logo-urls.ts`

**Purpose:** Discover logo URLs for services not in apps.json

**Strategies:**
1. SimpleIcons matching
2. Zapier directory scraping (placeholder)
3. Zapier Platform API (placeholder)
4. Manual mappings

**Usage:**
```bash
# Try all methods
./discover-zapier-logo-urls.ts

# Specific method
./discover-zapier-logo-urls.ts --method=simpleicons
./discover-zapier-logo-urls.ts --method=scrape
./discover-zapier-logo-urls.ts --method=api
```

### 3. Output Directories
**Location:** `/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier/`

**Structure:**
```
zapier/
├── README.md              # Documentation
├── manifest.json          # Download metadata
├── priority/              # Top 100 services
│   ├── Gmail.png
│   ├── Slack.png
│   └── ...
└── all/                   # All other services
    ├── Airtable.png
    └── ...
```

### 4. Documentation
**Location:** `/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier/README.md`

Complete documentation including:
- Directory structure
- Naming conventions
- Script usage
- Manifest format
- Data sources
- Limitations
- Execution recommendations

## Data Analysis

### Service Statistics
- **Total unique services:** 9,334 (from nouns-cleaned.json)
- **Services with icon URLs:** 16 (from apps.json)
- **Services needing URL discovery:** 9,318
- **Priority services defined:** 100 (top popular services)

### Data Sources

1. **apps.json** (16 apps with URLs)
   - Location: `/Users/nathanclevenger/projects/.org.ai/platform/sites/integrations.org.ai/data/apps.json`
   - Contains: App metadata with Zapier CDN icon URLs
   - Pattern: `https://cdn.zapier.com/storage/services/{hash}.png`

2. **nouns-cleaned.json** (9,334 service slugs)
   - Location: `/Users/nathanclevenger/projects/.org.ai/platform/packages/integrations/data/zapier/nouns-cleaned.json`
   - Contains: Service slugs from Zapier vocabulary analysis
   - Examples: `hubspot`, `google-sheets`, `salesforce`

3. **summary.json** (statistics)
   - Location: `/Users/nathanclevenger/projects/.org.ai/platform/packages/integrations/data/zapier/summary.json`
   - Contains: Aggregated statistics on Zapier vocabulary

### Logo URL Pattern

Zapier uses a CDN with hashed filenames:
```
https://cdn.zapier.com/storage/services/{hash}.png
```

Examples:
- Gmail: `https://cdn.zapier.com/storage/services/5f5e2c31117b22ab45e3d1e81a9ba22e.png`
- Slack: `https://cdn.zapier.com/storage/services/4c123c0e8c4aa235b8c6d18f42c2cc90.png`
- Google Sheets: `https://cdn.zapier.com/storage/services/1cf927d2e7a4101f994005a0c50612f5.png`

**Challenge:** Hashes are not predictable from service slugs.

## Manifest Structure

The script generates a `manifest.json` with:

```json
{
  "downloaded": "2025-11-17",
  "totalServices": 7155,
  "successfulDownloads": 6890,
  "failed": 265,
  "priorityDownloads": 100,
  "estimatedSize": "145.2 MB",
  "logos": [
    {
      "service": "Gmail",
      "zapierSlug": "gmail",
      "filename": "Gmail.png",
      "size": "32.5 KB",
      "dimensions": "256x256",
      "url": "https://cdn.zapier.com/storage/services/...",
      "category": "Email",
      "isPriority": true
    }
  ],
  "errors": [
    {
      "service": "OldService",
      "zapierSlug": "old-service",
      "url": "https://cdn.zapier.com/...",
      "error": "HTTP 404"
    }
  ]
}
```

## Expected Results

### Current State (With Existing Data)
- **Downloadable:** ~16 logos (services with known URLs)
- **Time:** 2-3 minutes
- **Size:** ~500 KB - 1 MB
- **Success rate:** 90-95% (some URLs may be stale)

### After URL Discovery
- **Potential:** 9,334 logos (if all URLs discovered)
- **Time:** 3-4 hours (with rate limiting)
- **Size:** ~150-200 MB (estimated)
- **Success rate:** 85-95% (some services may be deprecated)

## Execution Recommendations

### Phase 1: Test Run ✅ Ready Now
```bash
cd /Users/nathanclevenger/projects/.org.ai/schema/scripts
./download-zapier-logos.ts --priority-only --batch-size=10
```
- Downloads: ~16 priority logos with known URLs
- Time: ~2 minutes
- Purpose: Verify script functionality

### Phase 2: URL Discovery ⏳ Requires Implementation
```bash
./discover-zapier-logo-urls.ts --method=all
```
- Purpose: Find URLs for remaining 9,318 services
- Methods:
  1. ✅ SimpleIcons matching (implemented)
  2. ⏳ Web scraping (needs implementation)
  3. ⏳ Zapier API (needs API key)

### Phase 3: Full Download ⏳ After URL Discovery
```bash
./download-zapier-logos.ts --batch-size=50 --rate-limit=100
```
- Downloads: All services with discovered URLs
- Time: 2-4 hours
- Purpose: Complete logo collection

## Rate Limiting Strategy

**Conservative (Recommended):**
- Batch size: 25
- Rate limit: 200ms
- ~180 logos/minute
- ~10,800 logos/hour

**Moderate:**
- Batch size: 50
- Rate limit: 100ms
- ~300 logos/minute
- ~18,000 logos/hour

**Aggressive (Not recommended):**
- Batch size: 100
- Rate limit: 50ms
- ~600 logos/minute
- May trigger rate limiting

## Estimated Download Size

Based on sample sizes from apps.json:

| Type | Size per Logo | 100 Logos | 1,000 Logos | 9,334 Logos |
|------|---------------|-----------|-------------|-------------|
| Small (16KB avg) | 16 KB | 1.6 MB | 16 MB | 149 MB |
| Medium (32KB avg) | 32 KB | 3.2 MB | 32 MB | 298 MB |
| Large (64KB avg) | 64 KB | 6.4 MB | 64 MB | 597 MB |

**Estimated:** 150-300 MB for all logos

## Next Steps

### Immediate (Can Execute Now)
1. ✅ Test download script with priority services
   ```bash
   ./download-zapier-logos.ts --priority-only
   ```

2. ✅ Run SimpleIcons URL discovery
   ```bash
   ./discover-zapier-logo-urls.ts --method=simpleicons
   ```

### Short Term (Needs Implementation)
3. ⏳ Implement web scraping for URL discovery
   - Parse zapier.com/apps directory
   - Extract logo URLs from app pages
   - Map to service slugs

4. ⏳ Try Zapier Platform API
   - Get API key from Zapier
   - Query app metadata
   - Extract icon URLs

### Long Term (After URL Discovery)
5. ⏳ Full logo download
6. ⏳ Manifest review and cleanup
7. ⏳ Integration with schema.org.ai

## Limitations & Challenges

### Current Limitations
1. **Limited URL Coverage**
   - Only 16 services have confirmed URLs
   - 9,318 services need URL discovery
   - Zapier CDN uses unpredictable hashes

2. **URL Discovery Challenges**
   - Web scraping needs HTML parser
   - API access requires authentication
   - Rate limiting on both approaches

3. **Logo Availability**
   - Some services may be deprecated
   - Some logos may have moved
   - Some services may not have logos

### Solutions

1. **Web Scraping**
   - Use cheerio or jsdom for parsing
   - Implement robust error handling
   - Cache results to avoid re-scraping

2. **API Integration**
   - Request Zapier Platform API access
   - Use official endpoints
   - More reliable than scraping

3. **Community Fallbacks**
   - Use SimpleIcons when available
   - Generate placeholder logos for missing
   - Document missing logos in manifest

## Files Reference

### Scripts
- **Download:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/download-zapier-logos.ts`
- **Discovery:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/discover-zapier-logo-urls.ts`

### Output
- **Logos:** `/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier/`
- **Manifest:** `/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier/manifest.json`
- **README:** `/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier/README.md`

### Data Sources
- **Apps:** `/Users/nathanclevenger/projects/.org.ai/platform/sites/integrations.org.ai/data/apps.json`
- **Services:** `/Users/nathanclevenger/projects/.org.ai/platform/packages/integrations/data/zapier/nouns-cleaned.json`
- **Summary:** `/Users/nathanclevenger/projects/.org.ai/platform/packages/integrations/data/zapier/summary.json`

## Conclusion

The script is **ready to execute** for the 16 services with known URLs. For comprehensive coverage of all 9,334 services, URL discovery implementation is required. The recommended approach is:

1. Start with SimpleIcons matching (already implemented)
2. Add web scraping for Zapier directory
3. Request Zapier Platform API access for official data

The script architecture supports all these methods and can easily incorporate new URL sources as they're discovered.
