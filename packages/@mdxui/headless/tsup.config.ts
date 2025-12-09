import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Disclosure & Expansion
    'components/disclosure': 'src/components/disclosure.tsx',
    'components/dialog': 'src/components/dialog.tsx',
    'components/popover': 'src/components/popover.tsx',
    // Navigation & Selection
    'components/menu': 'src/components/menu.tsx',
    'components/listbox': 'src/components/listbox.tsx',
    'components/combobox': 'src/components/combobox.tsx',
    'components/tabs': 'src/components/tabs.tsx',
    // Form Controls
    'components/switch': 'src/components/switch.tsx',
    'components/checkbox': 'src/components/checkbox.tsx',
    'components/radio-group': 'src/components/radio-group.tsx',
    'components/button': 'src/components/button.tsx',
    'components/input': 'src/components/input.tsx',
    'components/textarea': 'src/components/textarea.tsx',
    'components/select': 'src/components/select.tsx',
    'components/field': 'src/components/field.tsx',
    'components/label': 'src/components/label.tsx',
    'components/description': 'src/components/description.tsx',
    // Animation
    'components/transition': 'src/components/transition.tsx',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'hono', '@mdxui/jsx'],
  treeshake: true,
  banner: {
    js: '"use client";',
  },
})
