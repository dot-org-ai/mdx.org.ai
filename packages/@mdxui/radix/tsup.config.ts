import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Tier 1 - Simple
    'components/separator': 'src/components/separator.tsx',
    'components/label': 'src/components/label.tsx',
    'components/aspect-ratio': 'src/components/aspect-ratio.tsx',
    'components/visually-hidden': 'src/components/visually-hidden.tsx',
    'components/progress': 'src/components/progress.tsx',
    // Tier 2 - Moderate
    'components/checkbox': 'src/components/checkbox.tsx',
    'components/switch': 'src/components/switch.tsx',
    'components/toggle': 'src/components/toggle.tsx',
    'components/toggle-group': 'src/components/toggle-group.tsx',
    'components/slider': 'src/components/slider.tsx',
    'components/tabs': 'src/components/tabs.tsx',
    'components/accordion': 'src/components/accordion.tsx',
    'components/collapsible': 'src/components/collapsible.tsx',
    'components/radio-group': 'src/components/radio-group.tsx',
    // Tier 3 - Complex
    'components/dialog': 'src/components/dialog.tsx',
    'components/alert-dialog': 'src/components/alert-dialog.tsx',
    'components/dropdown-menu': 'src/components/dropdown-menu.tsx',
    'components/context-menu': 'src/components/context-menu.tsx',
    'components/select': 'src/components/select.tsx',
    // Tier 4 - Positioning
    'components/popover': 'src/components/popover.tsx',
    'components/tooltip': 'src/components/tooltip.tsx',
    'components/hover-card': 'src/components/hover-card.tsx',
    'components/navigation-menu': 'src/components/navigation-menu.tsx',
    'components/menubar': 'src/components/menubar.tsx',
    // Additional
    'components/avatar': 'src/components/avatar.tsx',
    'components/scroll-area': 'src/components/scroll-area.tsx',
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
