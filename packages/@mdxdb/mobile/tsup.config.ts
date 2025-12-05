import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/editor.tsx', 'src/sync.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-native',
    'expo',
    'expo-file-system',
    'expo-sqlite',
    'mdxld',
  ],
})
