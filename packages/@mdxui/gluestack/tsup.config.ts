import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.tsx', 'src/themes.ts', 'src/primitives.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-native', '@gluestack-ui/themed', 'nativewind'],
})
