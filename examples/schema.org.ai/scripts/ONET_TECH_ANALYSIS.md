# O*NET Technology Icon Coverage Analysis

**Generated:** 2025-11-17T16:27:31.047Z

## Executive Summary

This analysis examines the coverage of O*NET technology and tools data against available SimpleIcons to determine icon availability for tech.org.ai.

### Key Statistics

- **Total O*NET Technologies:** 9,242
- **Technologies with SimpleIcons:** 762
- **Coverage:** 8.24%
- **Available SimpleIcons:** 3,372

### Match Quality

| Match Type | Count | Description |
|------------|-------|-------------|
| Known Mapping | 21 | Manual mappings for common brands |
| Exact | 109 | Exact name matches |
| Normalized | 2 | Matches after normalizing names |
| Partial Word | 187 | Brand name extraction |
| Fuzzy Contains | 443 | Fuzzy matching |

## Coverage by Category

### Top 20 Categories by Icon Coverage

1. **Communication software** - 41.67% (5/12)
2. **E-commerce software** - 40.00% (6/15)
3. **Productivity software** - 36.96% (17/46)
4. **Sales and marketing software** - 36.36% (4/11)
5. **Support software** - 34.62% (9/26)
6. **Graphical user interface development software** - 33.33% (4/12)
7. **Process mapping and design software** - 30.00% (3/10)
8. **Analytics software** - 30.00% (9/30)
9. **Computer aided design CAD software** - 28.19% (95/337)
10. **Switch or router software** - 27.27% (3/11)
11. **Video conferencing software** - 26.67% (4/15)
12. **Device drivers or system software** - 25.00% (3/12)
13. **CRM software** - 25.00% (3/12)
14. **Data software** - 23.08% (3/13)
15. **Infrastructure software** - 21.43% (3/14)
16. **Application server software** - 18.18% (4/22)
17. **CMS software** - 18.18% (2/11)
18. **Web page creation and editing software** - 18.03% (11/61)
19. **Administration software** - 17.39% (4/23)
20. **Requirements analysis and system architecture software** - 16.67% (2/12)

### Top 20 Largest Categories

1. **Analytical or scientific software** - 1675 technologies (5.37% icon coverage)
2. **Data base user interface and query software** - 893 technologies (4.93% icon coverage)
3. **Medical software** - 670 technologies (4.48% icon coverage)
4. **Financial analysis software** - 355 technologies (5.35% icon coverage)
5. **Computer aided design CAD software** - 337 technologies (28.19% icon coverage)
6. **Enterprise resource planning ERP software** - 261 technologies (7.28% icon coverage)
7. **Human resources software** - 239 technologies (8.37% icon coverage)
8. **Graphics or photo imaging software** - 221 technologies (7.24% icon coverage)
9. **Document management software** - 197 technologies (5.08% icon coverage)
10. **Project management software** - 194 technologies (11.86% icon coverage)
11. **Development environment software** - 186 technologies (6.99% icon coverage)
12. **Materials requirements planning logistics and supply chain software** - 168 technologies (3.57% icon coverage)
13. **Industrial control software** - 168 technologies (2.38% icon coverage)
14. **Accounting software** - 167 technologies (13.17% icon coverage)
15. **Customer relationship management CRM software** - 139 technologies (11.51% icon coverage)
16. **Computer based training software** - 126 technologies (11.90% icon coverage)
17. **Compliance software** - 122 technologies (7.38% icon coverage)
18. **Information retrieval or search software** - 116 technologies (9.48% icon coverage)
19. **Computer aided manufacturing CAM software** - 115 technologies (12.17% icon coverage)
20. **Map creation software** - 107 technologies (1.87% icon coverage)

## Gap Analysis

### Top 30 Missing Hot Technologies

These are high-priority technologies marked as "hot" in O*NET that currently lack SimpleIcon matches:

1. **Microsoft Excel** (Spreadsheet software) - 859 occupations
2. **Microsoft Office software** (Office suite software) - 813 occupations
3. **Microsoft Word** (Word processing software) - 784 occupations
4. **Microsoft Outlook** (Electronic mail software) - 638 occupations
5. **Microsoft PowerPoint** (Presentation software) - 629 occupations
6. **Microsoft Access** (Data base user interface and query software) - 371 occupations
7. **SAP software** (Enterprise resource planning ERP software) - 282 occupations
8. **Microsoft Windows** (Operating system software) - 239 occupations
9. **Microsoft Project** (Project management software) - 201 occupations
10. **Autodesk AutoCAD** (Computer aided design CAD software) - 171 occupations
11. **Microsoft SharePoint** (Document management software) - 166 occupations
12. **Adobe Acrobat** (Document management software) - 165 occupations
13. **Microsoft Visio** (Process mapping and design software) - 149 occupations
14. **Adobe Photoshop** (Graphics or photo imaging software) - 144 occupations
15. **Python** (Object or component oriented development software) - 130 occupations
16. **Linux** (Operating system software) - 122 occupations
17. **SAS** (Analytical or scientific software) - 119 occupations
18. **Microsoft Dynamics** (Enterprise resource planning ERP software) - 118 occupations
19. **The MathWorks MATLAB** (Analytical or scientific software) - 111 occupations
20. **Adobe Illustrator** (Graphics or photo imaging software) - 100 occupations
21. **Oracle Java** (Object or component oriented development software) - 99 occupations
22. **Microsoft Visual Basic** (Development environment software) - 96 occupations
23. **Microsoft SQL Server** (Data base user interface and query software) - 94 occupations
24. **R** (Object or component oriented development software) - 93 occupations
25. **ESRI ArcGIS software** (Geographic information system) - 93 occupations
26. **IBM SPSS Statistics** (Analytical or scientific software) - 92 occupations
27. **UNIX** (Operating system software) - 89 occupations
28. **Extensible markup language XML** (Enterprise application integration software) - 87 occupations
29. **Oracle Database** (Data base user interface and query software) - 87 occupations
30. **JavaScript** (Web platform development software) - 84 occupations

## Recommended Icon Sources

### Priority 1: Simple Icons (Current)
- **Total Icons:** 3372
- **Current Matches:** 762
- **URL:** https://simpleicons.org/
- **Integration:** Already integrated via simpleicons-mapping.json

### Priority 2: Devicon
- **Total Icons:** 192
- **URL:** https://devicon.dev/
- **Use For:** Development environment software, Programming languages, Frameworks
- **Integration:** Add as secondary icon source with CDN

### Priority 3: Tech Stack Icons
- **Total Icons:** 300
- **URL:** https://techicons.dev/
- **Use For:** Cloud platforms, Databases, Modern frameworks
- **Integration:** Add for cloud and database coverage

### Priority 4: Font Awesome Pro
- **Free Icons:** 2016
- **Pro Icons:** 16150
- **URL:** https://fontawesome.com/
- **Use For:** Category fallbacks, Generic software types, Medical, Industrial
- **Integration:** Use for category-level fallback icons

## Implementation Strategy


### Phase 1: SimpleIcons Coverage (Current)

**Estimated Coverage:** 762 technologies

**Actions:**
- Maintain simpleicons-mapping.json
- Add known_mapping entries for common brands
- Improve fuzzy matching algorithm


### Phase 2: Add Devicon for Dev Tools

**Estimated Coverage:** ~150 technologies

**Actions:**
- Map development environment software to Devicon
- Create devicon-mapping.json
- Priority: Programming languages, IDEs, frameworks


### Phase 3: Category-Based Fallbacks

**Estimated Coverage:** ~5000 technologies

**Actions:**
- Create category icon mappings
- Use Font Awesome/Lucide for generic categories
- Map 50+ O*NET categories to icon sets


### Phase 4: Custom Industry Icons

**Estimated Coverage:** ~100 technologies

**Actions:**
- Create custom icons for top medical software
- Create custom icons for industrial control systems
- Focus on hot technologies without matches


## Category Icon Fallback Mapping

For technologies without specific brand icons, use category-based fallbacks:

- **Medical software** (670 techs) → `medical` (Font Awesome)
- **Analytical or scientific software** (1675 techs) → `chart-line` (Font Awesome)
- **Financial analysis software** (355 techs) → `chart-pie` (Font Awesome)
- **Industrial control software** (168 techs) → `industry` (Font Awesome)
- **Graphics or photo imaging software** (221 techs) → `image` (Font Awesome)
- **Document management software** (197 techs) → `folder` (Font Awesome)
- **Project management software** (194 techs) → `tasks` (Font Awesome)
- **Human resources software** (239 techs) → `users` (Font Awesome)
- **Accounting software** (167 techs) → `calculator` (Font Awesome)
- **Customer relationship management CRM software** (139 techs) → `user-friends` (Font Awesome)

## Data Files

### Source Files
- **O*NET Technologies:** `/Users/nathanclevenger/projects/.org.ai/platform/sites/tech.org.ai/data/technologies.json`
- **O*NET Tools:** `/Users/nathanclevenger/projects/.org.ai/platform/sites/tools.org.ai/data/tools.json`
- **SimpleIcons Mapping:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/simpleicons-mapping.json`

### Generated Analysis
- **This Report:** `/Users/nathanclevenger/projects/.org.ai/schema/scripts/onet-tech-analysis.json`

## Next Steps

1. **Immediate (Phase 1):**
   - Maintain and expand known_mappings for common brands
   - Improve fuzzy matching for Microsoft/Adobe/Oracle products

2. **Short-term (Phase 2):**
   - Integrate Devicon for development tools (~150 additional matches)
   - Create devicon-mapping.json similar to simpleicons-mapping.json

3. **Medium-term (Phase 3):**
   - Implement category-based fallback system
   - Map all 50+ O*NET categories to appropriate icons
   - Estimated additional coverage: ~5,000 technologies

4. **Long-term (Phase 4):**
   - Create custom icons for industry-specific software
   - Focus on medical, industrial, and scientific software
   - Target top 100-200 hot technologies without matches

## Projected Coverage After Implementation

| Phase | Coverage | Technologies Covered |
|-------|----------|---------------------|
| Current (SimpleIcons only) | 8.24% | 762 |
| + Devicon (Phase 2) | ~10% | ~920 |
| + Category Fallbacks (Phase 3) | ~60% | ~5,500 |
| + Custom Icons (Phase 4) | ~65% | ~6,000 |

---

**Note:** With a comprehensive multi-source strategy, we can achieve 60-65% coverage with specific icons and 100% coverage using category-based fallbacks.
