import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/conformance.ts', 'src/benchmark.ts', 'src/stub.ts', 'src/bench.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
})
