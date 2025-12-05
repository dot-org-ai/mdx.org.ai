# Technology Icon Strategy for tech.org.ai

## Quick Reference

**Status:** Analysis Complete
**Date:** November 17, 2025
**Coverage:** 8.24% (762/9,242 technologies)
**Files:**
- Analysis: `/Users/nathanclevenger/projects/.org.ai/schema/scripts/onet-tech-analysis.json`
- Report: `/Users/nathanclevenger/projects/.org.ai/schema/scripts/ONET_TECH_ANALYSIS.md`

## Data Sources Located

### O*NET Technology Data
1. **Technologies:** `/Users/nathanclevenger/projects/.org.ai/platform/sites/tech.org.ai/data/technologies.json`
   - 9,242 technologies
   - Categories: 50+ software categories
   - Metadata: hotTechnology, inDemand, commodityCode, occupations

2. **Tools:** `/Users/nathanclevenger/projects/.org.ai/platform/sites/tools.org.ai/data/tools.json`
   - 18,105 tools
   - Total unique tech items: 27,347

3. **SimpleIcons Mapping:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/simpleicons-mapping.json`
   - 3,372 available icons
   - 407 mapped to services

## Current Coverage Analysis

### Match Distribution
- **Known Mapping:** 21 (manual brand mappings)
- **Exact:** 109 (perfect name matches)
- **Normalized:** 2 (name normalization)
- **Partial Word:** 187 (brand extraction)
- **Fuzzy Contains:** 443 (fuzzy matching)

### Example Successful Matches
```json
[
  {"name": "PHP", "slug": "php", "type": "exact"},
  {"name": "Structured query language SQL", "slug": "mysql", "type": "known_mapping"},
  {"name": "Atlassian JIRA", "slug": "atlassian", "type": "partial_word"},
  {"name": "Salesforce software", "slug": "salesforce", "type": "partial_word"},
  {"name": "Intuit QuickBooks", "slug": "quickbooks", "type": "partial_word"}
]
```

### High-Priority Gaps
Top missing hot technologies (by occupation count):
1. Microsoft Excel (859 occupations)
2. Microsoft Office software (813 occupations)
3. Microsoft Word (784 occupations)
4. Microsoft Outlook (638 occupations)
5. Microsoft PowerPoint (629 occupations)

## Multi-Source Icon Strategy

### Tier 1: Brand-Specific Icons

#### Source 1: Simple Icons (Current - 3,372 icons)
- **Coverage:** 762 O*NET technologies (8.24%)
- **Best For:** Brand logos, popular services
- **Integration:** Already integrated
- **URL:** https://simpleicons.org/

#### Source 2: Devicon (192 icons)
- **Coverage:** ~150 additional technologies
- **Best For:** Programming languages, frameworks, dev tools
- **Integration:** Add as secondary source
- **URL:** https://devicon.dev/
- **Examples:** Python, Java, React, Vue, Docker, Kubernetes

#### Source 3: Tech Stack Icons (~300 icons)
- **Coverage:** ~50 additional technologies
- **Best For:** Cloud platforms, modern databases
- **Integration:** Add for cloud/DB coverage
- **URL:** https://techicons.dev/
- **Examples:** AWS, Azure, GCP, PostgreSQL, MongoDB

### Tier 2: Category Fallback Icons

#### Source 4: Font Awesome Pro (16,150 icons)
- **Coverage:** ~5,000 technologies via categories
- **Best For:** Generic categories, fallbacks
- **Integration:** Category-based mapping
- **URL:** https://fontawesome.com/

#### Recommended Category Mappings:
```javascript
{
  "Medical software": "fa-stethoscope",
  "Analytical or scientific software": "fa-chart-line",
  "Financial analysis software": "fa-chart-pie",
  "Industrial control software": "fa-industry",
  "Graphics or photo imaging software": "fa-image",
  "Document management software": "fa-folder-open",
  "Project management software": "fa-tasks",
  "Human resources software": "fa-users",
  "Accounting software": "fa-calculator",
  "Customer relationship management CRM software": "fa-user-friends"
}
```

### Tier 3: Custom Icons

Create custom SVG icons for:
- Top 100 hot technologies without matches
- Industry-specific software (medical, industrial)
- Government/compliance software

## Implementation Phases

### Phase 1: Enhanced SimpleIcons (Immediate)
**Goal:** Improve current 8.24% to ~10%
**Actions:**
1. Add more known_mappings for Microsoft suite
2. Improve fuzzy matching algorithm
3. Add brand variations (Office 365, O365, etc.)

**Estimated Impact:** +150 technologies

### Phase 2: Add Devicon (Week 1-2)
**Goal:** Cover development tools
**Actions:**
1. Fetch Devicon icon list
2. Create devicon-mapping.json
3. Map development environment software
4. Map programming languages
5. Map frameworks and libraries

**Estimated Impact:** +150 technologies (total ~920)

### Phase 3: Category Fallbacks (Week 3-4)
**Goal:** Comprehensive coverage via categories
**Actions:**
1. Map all 50+ O*NET categories to Font Awesome icons
2. Create category-icon-mapping.json
3. Implement fallback logic:
   - Try SimpleIcons
   - Try Devicon
   - Try Tech Stack Icons
   - Fall back to category icon

**Estimated Impact:** +5,000 technologies (total ~5,500, 60% coverage)

### Phase 4: Custom Icons (Month 2)
**Goal:** High-quality coverage for top priorities
**Actions:**
1. Design custom icons for top 100 hot technologies
2. Focus on medical software (Epic, MEDITECH, etc.)
3. Focus on industrial software
4. Focus on government/compliance software

**Estimated Impact:** +100 technologies with custom icons

## Technical Implementation

### Icon Resolution Logic
```javascript
async function getIconForTechnology(tech) {
  // 1. Try SimpleIcons
  const simpleIcon = await lookupSimpleIcon(tech.name);
  if (simpleIcon) return { source: 'simpleicons', icon: simpleIcon };
  
  // 2. Try Devicon
  const devIcon = await lookupDevicon(tech.name);
  if (devIcon) return { source: 'devicon', icon: devIcon };
  
  // 3. Try Tech Stack Icons
  const techIcon = await lookupTechStackIcon(tech.name);
  if (techIcon) return { source: 'techicons', icon: techIcon };
  
  // 4. Fall back to category
  const categoryIcon = getCategoryIcon(tech.category);
  return { source: 'category', icon: categoryIcon };
}
```

### Data Structure
```typescript
interface TechnologyIcon {
  technologyId: string;
  technologyName: string;
  category: string;
  icon: {
    source: 'simpleicons' | 'devicon' | 'techicons' | 'fontawesome' | 'custom';
    slug: string;
    svg?: string;
    color?: string;
    matchType: 'exact' | 'fuzzy' | 'category' | 'custom';
  };
  metadata: {
    hotTechnology: boolean;
    inDemand: boolean;
    occupationCount: number;
  };
}
```

## Expected Outcomes

### Coverage Projection
| Phase | Specific Icons | Category Icons | Total Coverage |
|-------|---------------|----------------|----------------|
| Current | 762 (8.24%) | 0 | 8.24% |
| Phase 1 | 920 (10%) | 0 | 10% |
| Phase 2 | 920 (10%) | 0 | 10% |
| Phase 3 | 920 (10%) | 5,000 (54%) | 64% |
| Phase 4 | 1,020 (11%) | 5,000 (54%) | 65% |

### Quality Metrics
- **Exact brand matches:** ~1,000 technologies (11%)
- **Category fallbacks:** ~5,000 technologies (54%)
- **Custom icons:** ~100 technologies (1%)
- **Total coverage:** ~6,100 technologies (66%)
- **Remaining uncategorized:** ~3,100 technologies (34%)

## Next Steps

1. **Review Analysis**
   - Read `/Users/nathanclevenger/projects/.org.ai/schema/scripts/ONET_TECH_ANALYSIS.md`
   - Review sample matches in JSON file

2. **Implement Phase 1**
   - Enhance known_mappings in matching script
   - Add Microsoft suite mappings
   - Add Adobe suite mappings
   - Add Oracle suite mappings

3. **Plan Phase 2**
   - Research Devicon API/CDN
   - Design devicon integration
   - Create mapping strategy

4. **Design Category System**
   - Map O*NET categories to Font Awesome icons
   - Create category hierarchy
   - Define fallback rules

## Files Reference

### Analysis Files
- **JSON Report:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/onet-tech-analysis.json` (401KB)
- **Markdown Summary:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/ONET_TECH_ANALYSIS.md` (10KB)
- **Strategy Doc:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/TECH_ICON_STRATEGY.md` (this file)

### Source Data
- **O*NET Technologies:** `/Users/nathanclevenger/projects/.org.ai/platform/sites/tech.org.ai/data/technologies.json`
- **O*NET Tools:** `/Users/nathanclevenger/projects/.org.ai/platform/sites/tools.org.ai/data/tools.json`
- **SimpleIcons Mapping:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/simpleicons-mapping.json`

### Integration Points
- **O*NET Nouns:** `/Users/nathanclevenger/projects/.org.ai/platform/packages/integrations/data/onet/nouns.json`
- **O*NET Actions:** `/Users/nathanclevenger/projects/.org.ai/platform/packages/integrations/data/onet/actions.json`

---

**Status:** Ready for implementation
**Next:** Begin Phase 1 enhancements to known_mappings
