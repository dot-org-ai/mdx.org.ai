/**
 * O*NET + UNSPSC Schema for mdxdb
 *
 * Defines the graph structure for occupational data with
 * UNSPSC product/service classification integration.
 *
 * Graph Structure:
 * - Occupations (1,016) - central nodes
 * - Content Model elements (Skills, Abilities, Knowledge, etc.)
 * - UNSPSC hierarchy (Segments → Families → Classes → Commodities)
 * - Weighted edges with statistical metadata
 */

// =============================================================================
// Thing Types (Nodes)
// =============================================================================

/**
 * O*NET Occupation - central entity
 */
export interface Occupation {
  /** O*NET-SOC Code (e.g., "15-1252.00") */
  code: string
  /** Occupation title */
  title: string
  /** Full description */
  description?: string
  /** Job Zone (1-5) preparation level */
  jobZone?: number
}

/**
 * Content Model Element - Skills, Abilities, Knowledge, etc.
 */
export interface ContentElement {
  /** Element ID (e.g., "2.A.1.a" for Reading Comprehension) */
  elementId: string
  /** Element name */
  name: string
  /** Full description */
  description?: string
  /** Category: Worker Characteristics, Worker Requirements, etc. */
  category: string
  /** Subcategory within the hierarchy */
  subcategory?: string
}

/**
 * Task Statement
 */
export interface Task {
  /** Task ID */
  taskId: string
  /** Task statement text */
  statement: string
  /** Task type: Core or Supplemental */
  taskType: 'Core' | 'Supplemental'
}

/**
 * Detailed Work Activity
 */
export interface DWA {
  /** DWA ID */
  dwaId: string
  /** DWA title */
  title: string
  /** Parent IWA ID */
  iwaId: string
}

/**
 * Intermediate Work Activity
 */
export interface IWA {
  /** IWA ID */
  iwaId: string
  /** IWA title */
  title: string
  /** Parent Element ID */
  elementId: string
}

// =============================================================================
// UNSPSC Hierarchy (connected via Tools/Tech Skills)
// =============================================================================

/**
 * UNSPSC Segment (top level, 2 digits)
 */
export interface UNSPSCSegment {
  /** Segment code (XX000000) */
  code: string
  /** Segment title */
  title: string
}

/**
 * UNSPSC Family (4 digits)
 */
export interface UNSPSCFamily {
  /** Family code (XXXX0000) */
  code: string
  /** Family title */
  title: string
  /** Parent segment code */
  segmentCode: string
}

/**
 * UNSPSC Class (6 digits)
 */
export interface UNSPSCClass {
  /** Class code (XXXXXX00) */
  code: string
  /** Class title */
  title: string
  /** Parent family code */
  familyCode: string
}

/**
 * UNSPSC Commodity (8 digits) - links to O*NET tools/tech
 */
export interface UNSPSCCommodity {
  /** Commodity code (XXXXXXXX) */
  code: string
  /** Commodity title */
  title: string
  /** Parent class code */
  classCode: string
}

// =============================================================================
// Relationship Types (Edges with Metadata)
// =============================================================================

/**
 * Weighted rating - common structure for O*NET attribute edges
 */
export interface WeightedRating {
  /** Scale type: IM (Importance), LV (Level), etc. */
  scale: 'IM' | 'LV' | 'CX' | 'CXP' | 'EX' | 'OI' | 'FT' | 'RT'
  /** Data value (typically 1-5 or 1-7) */
  value: number
  /** Sample size */
  n?: number
  /** Standard error */
  stdError?: number
  /** Lower 95% CI bound */
  lowerCI?: number
  /** Upper 95% CI bound */
  upperCI?: number
  /** Recommend suppress flag */
  suppress?: boolean
  /** Not relevant flag */
  notRelevant?: boolean
  /** Data collection date */
  date?: string
  /** Data source (Analyst, Incumbent, etc.) */
  source?: string
}

/**
 * Occupation → Skill/Ability/Knowledge edge metadata
 */
export interface OccupationAttributeEdge {
  /** Importance rating (1-5) */
  importance?: WeightedRating
  /** Level rating (1-7) */
  level?: WeightedRating
}

/**
 * Occupation → Task edge metadata
 */
export interface OccupationTaskEdge {
  /** Task type */
  taskType: 'Core' | 'Supplemental'
  /** Relevance rating */
  relevance?: WeightedRating
  /** Frequency rating */
  frequency?: WeightedRating
}

/**
 * Occupation → Tool/Technology edge metadata
 * Links to UNSPSC via commodityCode
 */
export interface OccupationToolEdge {
  /** UNSPSC Commodity Code - FK to UNSPSC hierarchy */
  commodityCode: string
  /** Commodity title (denormalized for convenience) */
  commodityTitle: string
  /** Hot Technology flag */
  hotTechnology?: boolean
  /** In Demand flag */
  inDemand?: boolean
  /** Example product/brand names */
  examples?: string[]
}

/**
 * Occupation → Occupation (Related) edge metadata
 */
export interface RelatedOccupationEdge {
  /** Relatedness score or category */
  relatedness?: number
}

/**
 * UNSPSC parent-child edge (no metadata needed)
 */
export interface UNSPSCHierarchyEdge {
  // Pure containment relationship
}

// =============================================================================
// Predicate Definitions
// =============================================================================

export const PREDICATES = {
  // Occupation → Content Model elements
  hasSkill: { reverse: 'skillOf' },
  hasAbility: { reverse: 'abilityOf' },
  hasKnowledge: { reverse: 'knowledgeOf' },
  hasWorkActivity: { reverse: 'workActivityOf' },
  hasWorkContext: { reverse: 'workContextOf' },
  hasWorkStyle: { reverse: 'workStyleOf' },
  hasInterest: { reverse: 'interestOf' },
  hasWorkValue: { reverse: 'workValueOf' },

  // Occupation → Tasks
  hasTask: { reverse: 'taskOf' },

  // Occupation → Tools/Tech (connects to UNSPSC)
  usesTool: { reverse: 'usedBy' },
  usesTechnology: { reverse: 'technologyUsedBy' },

  // Occupation → Occupation
  relatedTo: { reverse: 'relatedTo' }, // symmetric

  // Task → DWA → IWA hierarchy
  implementedBy: { reverse: 'implements' },
  partOfActivity: { reverse: 'hasActivity' },

  // UNSPSC hierarchy
  inClass: { reverse: 'hasCommodity' },
  inFamily: { reverse: 'hasClass' },
  inSegment: { reverse: 'hasFamily' },

  // Cross-dataset: Tool/Tech → UNSPSC Commodity
  classifiedAs: { reverse: 'classifies' },
} as const

// =============================================================================
// Import File Mapping
// =============================================================================

export const ONET_FILES = {
  // Entity files
  occupations: 'Occupation Data.xlsx',
  contentModel: 'Content Model Reference.xlsx',
  tasks: 'Task Statements.xlsx',
  dwas: 'DWA Reference.xlsx',
  iwas: 'IWA Reference.xlsx',
  jobZones: 'Job Zone Reference.xlsx',
  scales: 'Scales Reference.xlsx',

  // Relationship files (weighted edges)
  skills: 'Skills.xlsx',
  abilities: 'Abilities.xlsx',
  knowledge: 'Knowledge.xlsx',
  workActivities: 'Work Activities.xlsx',
  workContext: 'Work Context.xlsx',
  workStyles: 'Work Styles.xlsx',
  interests: 'Interests.xlsx',
  workValues: 'Work Values.xlsx',

  // Task relationships
  taskRatings: 'Task Ratings.xlsx',
  tasksToDWAs: 'Tasks to DWAs.xlsx',

  // Tools & Technology (UNSPSC link)
  toolsUsed: 'Tools Used.xlsx',
  technologySkills: 'Technology Skills.xlsx',
  unspscReference: 'UNSPSC Reference.xlsx',

  // Cross-cutting
  relatedOccupations: 'Related Occupations.xlsx',
  alternateTitles: 'Alternate Titles.xlsx',

  // Attribute crosslinks
  skillsToWorkActivities: 'Skills to Work Activities.xlsx',
  abilitiesToWorkActivities: 'Abilities to Work Activities.xlsx',
} as const

// =============================================================================
// URL Patterns
// =============================================================================

export const URL_PATTERNS = {
  occupation: (code: string) => `onet://occupation/${code}`,
  element: (id: string) => `onet://element/${id}`,
  task: (id: string) => `onet://task/${id}`,
  dwa: (id: string) => `onet://dwa/${id}`,
  iwa: (id: string) => `onet://iwa/${id}`,
  unspscSegment: (code: string) => `unspsc://segment/${code}`,
  unspscFamily: (code: string) => `unspsc://family/${code}`,
  unspscClass: (code: string) => `unspsc://class/${code}`,
  unspscCommodity: (code: string) => `unspsc://commodity/${code}`,
} as const
