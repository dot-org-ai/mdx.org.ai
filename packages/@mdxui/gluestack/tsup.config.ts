import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/themes.ts', 'src/primitives.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-native', '@gluestack-ui/themed', 'nativewind'],
})
