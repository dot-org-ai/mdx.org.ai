import { base } from './base.js'

/** @type {import('eslint').Linter.Config[]} */
export const react = [
  ...base,
  {
    rules: {
      // React-specific rules can be added here
    },
  },
]

export default react
