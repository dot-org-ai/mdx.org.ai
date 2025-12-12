/**
 * Template for tsconfig.json
 *
 * TypeScript configuration for the generated Fumadocs app.
 */

export interface TsconfigOptions {
  contentDir: string
}

export function generateTsconfig(options: TsconfigOptions): string {
  return `{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@content/*": ["${options.contentDir}/*"],
      "@customization/*": ["${options.contentDir}/.mdx/*"],
      "fumadocs-mdx:collections/*": [".source/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "${options.contentDir}/**/*.ts",
    "${options.contentDir}/**/*.tsx"
  ],
  "exclude": ["node_modules"]
}
`
}
