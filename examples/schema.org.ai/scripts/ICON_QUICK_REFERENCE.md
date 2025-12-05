# Icon Quick Reference Guide

**For developers implementing tech.org.ai icon system**

---

## TL;DR

```tsx
import { IconResolver } from '@/components/IconResolver';

<IconResolver service={service} size={24} />
```

That's it. The waterfall handles everything automatically.

---

## Icon Sources (Ordered by Priority)

### 1. SimpleIcons (407 services)
```bash
pnpm add simple-icons simple-icons-react
```

```tsx
import { SiHubspot } from 'simple-icons-react';
<SiHubspot size={24} />
```

**When to use:** Major tech brands (HubSpot, Salesforce, Slack, GitHub, etc.)
**Format:** SVG + React components
**Cost:** FREE

---

### 2. Zapier PNGs (7,155 services)
```tsx
<img src={service.icon} width={24} height={24} />
```

**When to use:** Any Zapier service (automatic fallback)
**Format:** PNG via CDN
**Cost:** FREE

---

### 3. Devicon (150+ dev tools)
```bash
pnpm add devicon
```

```tsx
<i className="devicon-javascript-plain" />
// Or as SVG
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" />
```

**When to use:** Programming languages, frameworks, databases
**Format:** Font or SVG
**Cost:** FREE

---

### 4. Brandfetch API (500K/month free)
```tsx
// Register at brandfetch.com/developers
const logoUrl = `https://api.brandfetch.io/v1/logo/${domain}`;
```

**When to use:** High-priority company logos
**Format:** WebP
**Cost:** FREE (up to 500K requests/month)
**Required:** API key

---

### 5. Logo.dev (Unlimited free)
```tsx
// Register at logo.dev
const logoUrl = `https://img.logo.dev/${domain}?token=${token}`;
```

**When to use:** Company logos (Brandfetch fallback)
**Format:** PNG/SVG
**Cost:** FREE (unlimited)
**Required:** API token

---

### 6. Font Awesome Brands (460+ brands)
```bash
pnpm add @fortawesome/fontawesome-svg-core \
         @fortawesome/free-brands-svg-icons \
         @fortawesome/react-fontawesome
```

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

<FontAwesomeIcon icon={faGithub} />
```

**When to use:** Popular brands not in SimpleIcons
**Format:** SVG + React components
**Cost:** FREE

---

### 7. Generic Category Icons (15 categories)
```tsx
<CategoryIcon category="crm" size={24} />
```

**When to use:** Ultimate fallback for unknown services
**Format:** Custom SVG
**Cost:** FREE (self-hosted)

---

## IconResolver Component (Recommended)

### Basic Usage

```tsx
import { IconResolver } from '@/components/IconResolver';

function ServiceCard({ service }) {
  return (
    <div>
      <IconResolver service={service} size={32} />
      <h3>{service.name}</h3>
    </div>
  );
}
```

### With Fallback Control

```tsx
<IconResolver
  service={service}
  size={48}
  fallback="category" // or "none"
/>
```

### Service Object Shape

```typescript
interface Service {
  slug: string;           // e.g., "hubspot"
  name: string;           // e.g., "HubSpot"
  category: string;       // e.g., "CRM"
  domain?: string;        // e.g., "hubspot.com"
  icon?: string;          // Zapier PNG URL
  brandColor?: string;    // e.g., "#FF7A59"
  isPriority?: boolean;   // Use premium API?
}
```

---

## Common Patterns

### Service Grid

```tsx
function ServiceGrid({ services }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {services.map(service => (
        <div key={service.slug} className="flex flex-col items-center">
          <IconResolver service={service} size={48} />
          <span className="text-sm mt-2">{service.name}</span>
        </div>
      ))}
    </div>
  );
}
```

### Inline Icon with Text

```tsx
function ServiceName({ service }) {
  return (
    <div className="flex items-center gap-2">
      <IconResolver service={service} size={20} />
      <span>{service.name}</span>
    </div>
  );
}
```

### O*NET Occupation Tech Stack

```tsx
import { useOnetIcons } from '@/hooks/useOnetIcons';

function OccupationTechStack({ socCode }) {
  const icons = useOnetIcons(socCode); // Returns array of icon slugs

  return (
    <div className="flex gap-2">
      {icons.map(iconSlug => (
        <IconResolver
          key={iconSlug}
          service={{ slug: iconSlug, category: 'technology' }}
          size={32}
        />
      ))}
    </div>
  );
}
```

### Dark Mode Support

```tsx
<IconResolver
  service={service}
  size={24}
  theme="dark" // or "light"
/>
```

---

## Performance Tips

### 1. Use React Query for Logo API Caching

```tsx
import { useQuery } from '@tanstack/react-query';

function LogoIcon({ domain }) {
  const { data: logoUrl } = useQuery({
    queryKey: ['logo', domain],
    queryFn: () => fetchLogo(domain),
    staleTime: 1000 * 60 * 60 * 24 * 7, // 1 week
  });

  return logoUrl ? <img src={logoUrl} /> : null;
}
```

### 2. Lazy Load Images

```tsx
<img src={iconUrl} loading="lazy" />
```

### 3. Preload Critical Icons

```tsx
<link rel="preload" as="image" href={criticalIconUrl} />
```

### 4. Use CDN for Static Icons

```tsx
// SimpleIcons CDN (no npm install needed)
<img src="https://cdn.simpleicons.org/hubspot" />
```

---

## Mapping Files

### SimpleIcons Mapping
**File:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/simpleicons-mapping.json`
**Size:** 1.6MB
**Services:** 407 matched

```json
{
  "hubspot": {
    "matched": true,
    "matchType": "exact",
    "slug": "hubspot",
    "title": "HubSpot",
    "hex": "FF7A59",
    "source": "simple-icons"
  }
}
```

### Devicon Mapping (Coming Soon)
**File:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/devicon-mapping.json`
**Services:** 150+ dev tools

```json
{
  "javascript": {
    "slug": "javascript",
    "styles": ["plain", "original"],
    "source": "devicon"
  }
}
```

### O*NET Icon Mapping (Coming Soon)
**File:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/onet-icon-mappings.json`
**Occupations:** 300 with tech icons

```json
{
  "15-1252.00": {
    "title": "Software Developers",
    "icons": ["react", "javascript", "python", "git", "vscode"]
  }
}
```

---

## Environment Variables

```bash
# .env.local

# Brandfetch (optional, for premium logo API)
BRANDFETCH_API_KEY=your_api_key_here

# Logo.dev (optional, for logo fallback)
LOGO_DEV_TOKEN=your_token_here

# Rate limiting
LOGO_API_MAX_REQUESTS_PER_MONTH=500000
```

---

## Debugging

### Check Which Icon Source Was Used

```tsx
import { useState, useEffect } from 'react';

function IconResolverDebug({ service }) {
  const [source, setSource] = useState<string>('unknown');

  // IconResolver will call this when icon is resolved
  useEffect(() => {
    console.log(`Service: ${service.slug}, Source: ${source}`);
  }, [source, service.slug]);

  return (
    <div>
      <IconResolver service={service} size={24} />
      <span className="text-xs text-gray-500">{source}</span>
    </div>
  );
}
```

### Test Icon Fallback Chain

```tsx
// Force fallback by removing icon sources
<IconResolver
  service={{ slug: 'unknown-service', category: 'crm' }}
  size={24}
  fallback="category"
/>
// Should show generic CRM icon
```

### Check API Quota Usage

```tsx
import { useBrandfetchQuota } from '@/hooks/useBrandfetchQuota';

function QuotaMonitor() {
  const { used, limit, remaining } = useBrandfetchQuota();

  return (
    <div>
      Brandfetch: {used}/{limit} ({remaining} remaining)
    </div>
  );
}
```

---

## FAQ

### Q: Which icon source should I use directly?

**A:** Always use `IconResolver` component. It handles the waterfall automatically.

### Q: Can I mix icon sources?

**A:** Yes, but `IconResolver` does this for you. Manual mixing is not recommended.

### Q: How do I add a new service icon?

**A:**
1. Check if it exists in SimpleIcons
2. If not, use Zapier PNG (if Zapier service)
3. If not, check Devicon (if dev tool)
4. If not, use Brandfetch/Logo.dev (if has domain)
5. If not, use Font Awesome (if major brand)
6. Otherwise, generic category icon will be used

### Q: How do I override an icon?

```tsx
// Don't do this:
// <img src={customIcon} />

// Do this:
// Add custom mapping in simpleicons-mapping.json
{
  "my-service": {
    "matched": true,
    "matchType": "manual",
    "slug": "custom-slug",
    "source": "simple-icons"
  }
}
```

### Q: What if an icon is outdated?

**A:**
1. Check for updates: `pnpm update simple-icons`
2. Re-generate mapping: `pnpm run generate:simpleicons-mapping`
3. For logo APIs (Brandfetch/Logo.dev), clear cache

### Q: How do I add dark mode support?

```tsx
<IconResolver
  service={service}
  size={24}
  theme={isDark ? 'dark' : 'light'}
/>
```

### Q: Can I use icons outside of React?

**A:** Yes:
- SimpleIcons: Use CDN `https://cdn.simpleicons.org/{slug}`
- Devicon: Use CDN `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/{name}/{name}-original.svg`
- Logo APIs: Direct API calls

### Q: How do I optimize for mobile?

**A:** Consider using Super Tiny Icons (473 ultra-lightweight SVGs):
```bash
pnpm add super-tiny-icons
```

```tsx
import tinyIcon from 'super-tiny-icons/images/svg/hubspot.svg';
<img src={tinyIcon} /> // Only 535 bytes average
```

---

## Cheat Sheet

| Need | Use | Cost |
|------|-----|------|
| **Major brand (HubSpot, Slack)** | SimpleIcons | FREE |
| **Zapier service** | Zapier PNG | FREE |
| **Dev tool (React, Python)** | Devicon | FREE |
| **Company logo** | Brandfetch/Logo.dev | FREE |
| **Generic brand** | Font Awesome | FREE |
| **Unknown service** | Category Icon | FREE |
| **Everything** | IconResolver | FREE |

---

## Resources

- **Icon Strategy:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/ICON_STRATEGY.md`
- **Coverage Summary:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/ICON_COVERAGE_SUMMARY.md`
- **SimpleIcons Analysis:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/SIMPLEICONS_ANALYSIS_SUMMARY.md`
- **SimpleIcons Mapping:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/simpleicons-mapping.json`

---

**Last Updated:** 2025-11-17
**Version:** 1.0
