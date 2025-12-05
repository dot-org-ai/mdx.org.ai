---
$id: https://schema.org.ai/ATTRIBUTION
$context: https://schema.org
$type: AboutPage
name: Attribution for schema.org.ai
description: Data source attribution and licensing information
license: CC-BY-SA-4.0
dateModified: 2025-01-17
---

# Attribution

This document provides detailed attribution for all data sources used in schema.org.ai.

## Data Sources

### Schema.org

- **Source**: [Schema.org](https://schema.org)
- **License**: CC BY-SA 3.0
- **Copyright**: Schema.org Community
- **Data Used**: 920 types, 1,518 properties
- **Attribution Required**: Yes
- **Changes Made**: Extended with Business-as-Code patterns, semantic triple support, and AI-native types

**Citation**:
```
Schema.org
https://schema.org
Licensed under CC BY-SA 3.0
```

## How We Use This Data

The schema.org.ai ontology extends Schema.org by:

1. **Generating MDX Documentation**: Each Schema.org type is documented as an MDX file with frontmatter, hierarchy information, and usage examples
2. **Business-as-Code Integration**: Adding semantic patterns for `$.Subject.predicate.Object` usage
3. **TypeScript Type Definitions**: Providing type-safe interfaces for all Schema.org types
4. **Hierarchical Navigation**: Building complete parent-child relationships and breadcrumb navigation
5. **SDK Integration**: Enabling seamless integration with sdk.do and the .org.ai ecosystem
6. **AI-Native Extensions**: Adding new types and properties for autonomous agents, digital scoring, modern web concepts, and Business-as-Code patterns

## Our License

This derived work is licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0), maintaining compatibility with the original Schema.org license while using the current recommended version.

## Required Attribution

When using schema.org.ai, please include:

```
Based on schema.org.ai (https://schema.org.ai)
Data sourced from Schema.org (https://schema.org)
Licensed under CC BY-SA 4.0
```

For academic or research use, you may cite as:

```bibtex
@software{{schemaorgai2025,
  title = {{schema.org.ai: Schema.org Vocabulary for Business-as-Code}},
  author = {{{{.do Platform Team}}}},
  year = {{2025}},
  url = {{https://schema.org.ai}},
  license = {{CC-BY-SA-4.0}},
  note = {{Based on Schema.org}}
}}
```

## Acknowledgments

We are grateful to the Schema.org Community for creating and maintaining the foundational vocabulary that powers semantic web applications worldwide. Their work enables better structured data, improved search engine understanding, and richer web experiences.

Special thanks to the organizations that sponsor and support Schema.org:
- Google
- Microsoft
- Yahoo
- Yandex
- And the broader Schema.org Community

## Contact

For questions about attribution or licensing:
- **Website**: https://schema.org.ai
- **GitHub**: https://github.com/dot-org-ai/schema.org.ai/issues
- **Community**: https://github.com/dot-org-ai/community

## Updates

This attribution document is maintained alongside the schema.org.ai repository. Last updated: 2025-01-17
