import { addons } from '@storybook/manager-api'
import { themes } from '@storybook/theming'

// Detect system preference and set manager theme
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

addons.setConfig({
  theme: prefersDark ? themes.dark : themes.light,
})

// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  addons.setConfig({
    theme: e.matches ? themes.dark : themes.light,
  })
})
