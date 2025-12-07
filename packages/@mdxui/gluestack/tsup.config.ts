import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.tsx', 'src/themes.ts', 'src/primitives.tsx'],
  format: ['esm', 'cjs'],
  // DTS disabled - gluestack-ui v2 has significant API type changes
  // TODO: Update primitives.tsx to use new gluestack-ui v2 styling props
  dts: false,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-native', '@gluestack-ui/themed', 'nativewind'],
})
