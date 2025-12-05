# Dual Structure Implementation Status

## Summary

Implemented source/generated dual structure pattern for .org.ai packages to solve the competing needs of human-friendly navigation (deep hierarchies) and MDX-friendly links (flat structure).

**Date**: 2025-11-17

## Pattern Overview

### The Problem

1. **Human Navigation**: 40K+ products are hard to navigate in a flat directory
2. **MDX Links**: Deep paths like `/Agriculture/CropProduction/OilseedAndGrainFarming/SoybeanFarming` don't work well in MDX

### The Solution

**Dual Structure**:
- **Source files**: `source/industries/{Sector}/{Subsector}/{Group}/{Industry}.mdx` (nested, safe to edit)
- **Generated files**: `industries/{Industry}.mdx` (flat, auto-generated, components)

### Key Innovation

Sections in source files automatically convert to React components:
```
## Properties → <Properties />
## Classification → <Classification />
```

## Implementation Status

### ✅ Completed

#### 1. Architecture Design
- [x] Created comprehensive ARCHITECTURE.md
- [x] Documented dual structure pattern
- [x] Defined source/generated separation
- [x] Specified section-to-component mapping

**Files**:
- `platform/ai/packages/industries.org.ai/ARCHITECTURE.md`

#### 2. Generator Script
- [x] Created generate-flat.ts script
- [x] Implemented MDX parsing (frontmatter + sections)
- [x] Implemented section extraction
- [x] Implemented component conversion
- [x] Added support for $id, $type frontmatter keys
- [x] Added source file path tracking
- [x] Added npm script: `pnpm generate:flat`

**Files**:
- `platform/ai/packages/industries.org.ai/src/scripts/generate-flat.ts` (287 lines)
- `platform/ai/packages/industries.org.ai/src/scripts/README.md`
- `platform/ai/packages/industries.org.ai/package.json` (updated)

#### 3. Component Library
- [x] Created Classification component
- [x] Created Properties component
- [x] Created Usage component
- [x] Created Examples component
- [x] Created Related component
- [x] Created component index

**Files**:
- `platform/ai/packages/industries.org.ai/src/components/Classification.tsx`
- `platform/ai/packages/industries.org.ai/src/components/Properties.tsx`
- `platform/ai/packages/industries.org.ai/src/components/Usage.tsx`
- `platform/ai/packages/industries.org.ai/src/components/Examples.tsx`
- `platform/ai/packages/industries.org.ai/src/components/Related.tsx`
- `platform/ai/packages/industries.org.ai/src/components/index.ts`

#### 4. Example Implementation
- [x] Created source directory structure
- [x] Created SoybeanFarming.mdx source file
- [x] Created CornFarming.mdx source file
- [x] Generated flat files successfully
- [x] Verified component conversion
- [x] Verified frontmatter preservation

**Files**:
- `platform/ai/packages/industries.org.ai/source/industries/Agriculture/CropProduction/OilseedAndGrainFarming/SoybeanFarming.mdx`
- `platform/ai/packages/industries.org.ai/source/industries/Agriculture/CropProduction/OilseedAndGrainFarming/CornFarming.mdx`
- `platform/ai/packages/industries.org.ai/industries/SoybeanFarming.mdx` (generated)
- `platform/ai/packages/industries.org.ai/industries/CornFarming.mdx` (generated)

#### 5. Documentation
- [x] Created DUAL_STRUCTURE_PATTERN.md (comprehensive guide)
- [x] Created generator README
- [x] Updated ARCHITECTURE.md
- [x] Documented workflow
- [x] Documented benefits
- [x] Documented migration paths

**Files**:
- `platform/ai/packages/DUAL_STRUCTURE_PATTERN.md` (380 lines)
- `platform/ai/packages/industries.org.ai/src/scripts/README.md`

## Generator Output Example

### Source File (Nested)

**Location**: `source/industries/Agriculture/CropProduction/OilseedAndGrainFarming/SoybeanFarming.mdx`

```mdx
---
$id: https://industries.org.ai/SoybeanFarming
$type: https://industries.org.ai/Industry
naics: "111110"
title: Soybean Farming
---

# Soybean Farming

Description...

## Classification

NAICS details...

## Properties

Key characteristics...
```

### Generated File (Flat)

**Location**: `industries/SoybeanFarming.mdx`

```mdx
---
$id: "https://industries.org.ai/SoybeanFarming"
$type: "https://industries.org.ai/Industry"
naics: "111110"
title: "Soybean Farming"
source: "source/industries/Agriculture/CropProduction/OilseedAndGrainFarming/SoybeanFarming.mdx"
---

import { Classification, Properties } from 'industries.org.ai/components'

# Soybean Farming

Description...

<Classification naics="111110" sector="Agriculture" />

<Properties industry="SoybeanFarming" />
```

## Benefits Achieved

### 1. Human-Friendly Navigation ✅
```
source/industries/
  Agriculture/              ← Easy to find
    CropProduction/         ← Navigate hierarchy
      OilseedAndGrainFarming/  ← Browse group
        SoybeanFarming.mdx  ← Edit this
```

### 2. MDX-Friendly Links ✅
```mdx
<!-- Simple flat links -->
[Soybean Farming](/SoybeanFarming)

<!-- vs. nested nightmare -->
[Soybean Farming](/Agriculture/CropProduction/OilseedAndGrainFarming/SoybeanFarming)
```

### 3. Safe Enrichment ✅
- Source files never overwritten
- Enrichments persist
- Clear edit/generate workflow

### 4. Component Reusability ✅
- DRY principle for docs
- Consistent rendering
- Type-safe props

## Next Steps

### 1. Apply to Other .org.ai Packages

#### occupations.org.ai (SOC)
```
source/occupations/{MajorGroup}/{MinorGroup}/{BroadOccupation}/{DetailedOccupation}.mdx
→ occupations/{DetailedOccupation}.mdx
```

**Components**: `<SOCClassification />`, `<Tasks />`, `<Knowledge />`, `<Skills />`

#### processes.org.ai (APQC)
```
source/processes/{Category}/{ProcessGroup}/{Process}/{Activity}.mdx
→ processes/{Activity}.mdx
```

**Components**: `<ProcessClassification />`, `<Inputs />`, `<Outputs />`, `<Steps />`

#### products.org.ai (GS1 GPC)
```
source/products/{Segment}/{Family}/{Class}/{Brick}.mdx
→ products/{Brick}.mdx
```

**Components**: `<ProductClassification />`, `<Attributes />`, `<Variants />`

#### naics.org.ai
```
source/naics/{Sector}/{Subsector}/{IndustryGroup}/{Industry}.mdx
→ naics/{Industry}.mdx
```

**Components**: `<IndustryCode />`, `<Examples />`, `<Exclusions />`

### 2. Scale Up Data Generation

For packages with large datasets:
1. Create XLSX/TSV → Source MDX generator
2. Generate nested source files from data
3. Run generate:flat to create flat files
4. Enrichment happens in source files

### 3. Integration with Existing Generators

Update existing generators to:
1. Output to `source/{namespace}/` instead of flat
2. Organize by domain hierarchy
3. Use generate:flat for flat file creation

### 4. Documentation Sites

Update sites to:
1. Read from flat files for routing
2. Display source path for editing
3. Add "Edit on GitHub" links to source files

## Files Created/Modified

### Created
- `platform/ai/packages/industries.org.ai/src/scripts/generate-flat.ts` (287 lines)
- `platform/ai/packages/industries.org.ai/src/scripts/README.md` (198 lines)
- `platform/ai/packages/industries.org.ai/src/components/Classification.tsx` (42 lines)
- `platform/ai/packages/industries.org.ai/src/components/Properties.tsx` (25 lines)
- `platform/ai/packages/industries.org.ai/src/components/Usage.tsx` (28 lines)
- `platform/ai/packages/industries.org.ai/src/components/Examples.tsx` (29 lines)
- `platform/ai/packages/industries.org.ai/src/components/Related.tsx` (24 lines)
- `platform/ai/packages/industries.org.ai/src/components/index.ts` (13 lines)
- `platform/ai/packages/industries.org.ai/source/industries/Agriculture/CropProduction/OilseedAndGrainFarming/SoybeanFarming.mdx` (71 lines)
- `platform/ai/packages/industries.org.ai/source/industries/Agriculture/CropProduction/OilseedAndGrainFarming/CornFarming.mdx` (68 lines)
- `platform/ai/packages/industries.org.ai/industries/SoybeanFarming.mdx` (generated)
- `platform/ai/packages/industries.org.ai/industries/CornFarming.mdx` (generated)
- `platform/ai/packages/DUAL_STRUCTURE_PATTERN.md` (380 lines)
- `schema/scripts/DUAL_STRUCTURE_STATUS.md` (this file)

### Modified
- `platform/ai/packages/industries.org.ai/package.json` (added generate:flat script)
- `platform/ai/packages/industries.org.ai/ARCHITECTURE.md` (updated with generator details)

## Testing

### Generator Test
```bash
cd platform/ai/packages/industries.org.ai
pnpm generate:flat
```

**Result**:
```
🚀 Generating flat MDX files from source...
   Source: /Users/.../source/industries
   Output: /Users/.../industries

📄 Found 2 source files

============================================================
✅ Generation Complete
============================================================
   ✓ Generated: 2 files
   📁 Output: /Users/.../industries
```

### Verification

Generated files include:
- ✅ All frontmatter preserved ($id, $type, naics, etc.)
- ✅ Source path added
- ✅ Component imports added
- ✅ Sections converted to components
- ✅ Props passed from frontmatter

## Success Metrics

- [x] Generator script working
- [x] Component library created
- [x] Example files demonstrate pattern
- [x] Documentation comprehensive
- [x] Pattern reusable for other packages
- [x] Benefits clearly demonstrated

## Recommendations

### Immediate
1. Apply pattern to `occupations.org.ai` next (SOC has clear hierarchy)
2. Create migration script for existing flat files
3. Add tests for generator and components

### Short-term
1. Apply to `processes.org.ai` (APQC)
2. Apply to `products.org.ai` (GS1 GPC)
3. Update documentation sites to use pattern

### Long-term
1. Create unified generator framework
2. Add validation for frontmatter
3. Add linting for source files
4. Create VS Code extension for authoring

## Related Documents

- `platform/ai/packages/industries.org.ai/ARCHITECTURE.md` - Pattern architecture
- `platform/ai/packages/DUAL_STRUCTURE_PATTERN.md` - Reusable pattern guide
- `platform/ai/packages/industries.org.ai/src/scripts/README.md` - Generator docs
- `schema/site/content/docs/Product.mdx` - Example schema.org.ai file
- `scripts/PRODUCTS_SERVICES_STATUS.md` - Products/services work
- `scripts/SEMANTIC_TYPE_SYSTEM.md` - $type frontmatter system
