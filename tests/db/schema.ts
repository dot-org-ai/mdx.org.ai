/**
 * Shared schema for database tests
 */

export const schema = {
  Post: {
    title: 'string',
    content: 'markdown',
    author: 'Author.posts',
    tags: ['Tag.posts'],
  },
  Author: {
    name: 'string',
    email: 'string',
    bio: 'string?',
  },
  Tag: {
    name: 'string',
    slug: 'string',
  },
  // Schema.org types for ingestion tests
  SchemaType: {
    label: 'string',
    comment: 'string',
    subClassOf: 'string?',
    properties: 'json',
  },
  SchemaProperty: {
    label: 'string',
    comment: 'string',
    domainIncludes: 'string',
    rangeIncludes: 'string',
  },
} as const
