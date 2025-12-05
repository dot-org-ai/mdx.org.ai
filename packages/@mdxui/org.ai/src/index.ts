/**
 * @mdxui/org.ai - Ontology UI components for org.ai
 *
 * Provides components for rendering Schema.org-style ontology documentation:
 * - Thing: Detail view for a single entity type
 * - Things: Directory/card list of multiple entities
 * - Layout: Full-page layout with nav sidebar and TOC
 *
 * @packageDocumentation
 */

// Components
export { Thing } from './components/Thing.js'
export type {
  ThingProps,
  ThingProperty,
  ThingRelationship,
  ThingSearch,
  ThingAction,
  ThingEvent,
} from './components/Thing.js'

export { Things } from './components/Things.js'
export type {
  ThingsProps,
  ThingsCategory,
  ThingsEntity,
} from './components/Things.js'

export { Layout } from './components/Layout.js'
export type {
  LayoutProps,
  LayoutLogo,
  LayoutLink,
  LayoutSection,
  LayoutTocItem,
  LayoutPromo,
} from './components/Layout.js'
