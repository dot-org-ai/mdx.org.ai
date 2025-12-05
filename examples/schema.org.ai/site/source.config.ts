import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content/docs',
});

export const types = defineDocs({
  dir: 'content/types',
});

export const properties = defineDocs({
  dir: 'content/properties',
});

export default defineConfig();
