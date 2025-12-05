---
$id: https://schema.org.ai
$context: https://schema.org.ai
name: schema.org.ai
license: CC-BY-SA-4.0
---

# schema.org.ai

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

Schema.org vocabulary ontology with 871 types for Business-as-Code.

## Overview

This repository contains MDX documentation for all Schema.org types, organized hierarchically from Thing through all subclasses, **plus schema.org.ai extensions** for AI-native Business-as-Code.

**Data Source**: [Schema.org](https://schema.org) (CC BY-SA 3.0)

## Extensions to Schema.org

schema.org.ai extends the base Schema.org vocabulary with modern AI, web, and digital concepts:

### Digital Scoring Property

- **`digital`** (0.0-1.0) - Quantifies the digital maturity or digital-first nature of any Thing

### AI & Autonomous Agent Types

- **[`Agent`](things/Agent.mdx)** - Autonomous AI agents
- **[`Tool`](things/Tool.mdx)** - Tools that agents can use
- **[`Generation`](things/Generation.mdx)** - AI generation instances and outputs
- **[`Prompt`](things/Prompt.mdx)** - AI prompts and prompt templates
- **[`Model`](things/Model.mdx)** - AI/ML models
- **[`Workflow`](things/Workflow.mdx)** - Autonomous workflow definitions
- **[`Capability`](things/Capability.mdx)** - Agent capabilities and skills

### Modern Web & Landing Page Types

- **[`LandingPage`](things/LandingPage.mdx)** - Marketing landing pages optimized for conversion
- **[`HeroSection`](things/HeroSection.mdx)** - Hero sections with prominent CTAs
- **[`WPHero`](things/WPHero.mdx)** - WordPress hero sections/blocks
- **[`FeatureSection`](things/FeatureSection.mdx)** - Product/service feature highlights
- **[`CTASection`](things/CTASection.mdx)** - Call-to-action sections
- **[`TestimonialSection`](things/TestimonialSection.mdx)** - Customer testimonials and social proof
- **[`PricingSection`](things/PricingSection.mdx)** - Pricing tables and plans

### Business-as-Code Concepts

- **[`API`](things/API.mdx)** - API endpoints and services (REST, RPC, GraphQL)
- **[`Webhook`](things/Webhook.mdx)** - Webhook receivers for event-driven architecture
- **[`MCP`](things/MCP.mdx)** - Model Context Protocol servers (RPC-based)
- **[`SDK`](things/SDK.mdx)** - Software Development Kit packages
- **[`CLI`](things/CLI.mdx)** - Command-line interface tools

## Structure

```
schema.org.ai/
├── things/          # 871 MDX files
├── scripts/         # Generation and transformation scripts
├── site/            # Fumadocs documentation site
└── package/         # NPM package with mdxe build
```

## Features

- **871 MDX files** with complete type hierarchy
- Breadcrumb navigation (Thing > Action > CreateAction)
- Direct subclasses listing with links
- Business-as-Code usage examples
- Schema.org resource links
- AI-native extensions (Agent, Tool, Model, etc.)
- Digital scoring property (0.0-1.0)

## License

This work is licensed under [Creative Commons Attribution-ShareAlike 4.0 International](LICENSE) (CC BY-SA 4.0).

**Data Attribution**: Based on Schema.org (https://schema.org) licensed under CC BY-SA 3.0.

See [ATTRIBUTION.md](ATTRIBUTION.md) for complete data source details.

## Required Attribution

```
Based on schema.org.ai (https://schema.org.ai)
Data sourced from Schema.org (https://schema.org)
Licensed under CC BY-SA 4.0
```

## Installation

```bash
npm install schema.org.ai
# or
pnpm add schema.org.ai
# or
yarn add schema.org.ai
```

## Usage

```typescript
import {{ $ }} from 'sdk.do'
import type {{ Thing }} from 'schema.org.ai'

// Semantic patterns
const item = await $.Thing.create({{
  $type: 'Thing',
  name: 'Example'
}})

const result = await $.Thing.get('item-id')
```

## Links

- **Website**: https://schema.org.ai
- **GitHub**: https://github.com/dot-org-ai/schema.org.ai
- **Package**: https://www.npmjs.com/package/schema.org.ai
- **Original Source**: https://schema.org
- **.org.ai Ecosystem**: https://github.com/dot-org-ai

## Related Ontologies

- [schema.org.ai](https://schema.org.ai) - Schema.org vocabulary
- [verbs.org.ai](https://verbs.org.ai) - Business verbs and actions
- [process.org.ai](https://process.org.ai) - Business processes
- [graph.org.ai](https://graph.org.ai) - Semantic graph database

## Community

- **Issues**: https://github.com/dot-org-ai/schema.org.ai/issues
- **Discussions**: https://github.com/dot-org-ai/community/discussions
- **Discord**: https://discord.gg/dotdo
