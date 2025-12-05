import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    'components/index': 'src/components/index.ts',
    'components/MDXLDEditor': 'src/components/MDXLDEditor.tsx',
    'components/MDXLDJSONField': 'src/components/MDXLDJSONField.tsx',
    'views/index': 'src/views/index.ts',
    'views/CardView': 'src/views/CardView.tsx',
    'views/ListView': 'src/views/ListView.tsx',
    'views/ViewToggle': 'src/views/ViewToggle.tsx',
    'views/viewsPlugin': 'src/views/viewsPlugin.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'payload', '@payloadcms/ui'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
