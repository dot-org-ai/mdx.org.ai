import { loader } from 'fumadocs-core/source';
import { docs, types, properties } from 'fumadocs-mdx:collections/server';

export const docsSource = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
});

export const typesSource = loader({
  source: types.toFumadocsSource(),
  baseUrl: '/',
});

export const propertiesSource = loader({
  source: properties.toFumadocsSource(),
  baseUrl: '/',
});

// Keep old export for backwards compatibility
export const source = docsSource;
