/**
 * Template for package.json
 *
 * Package configuration for the generated Fumadocs app.
 */

export interface PackageJsonOptions {
  projectName: string
}

export function generatePackageJson(options: PackageJsonOptions): string {
  return JSON.stringify(
    {
      name: options.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-docs',
      version: '0.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        'types:check': 'fumadocs-mdx && tsc --noEmit',
        postinstall: 'fumadocs-mdx',
        preview: 'opennextjs-cloudflare build && opennextjs-cloudflare preview',
        deploy: 'opennextjs-cloudflare build && opennextjs-cloudflare deploy',
      },
      dependencies: {
        '@opennextjs/cloudflare': 'latest',
        'fumadocs-core': '^16.2.2',
        'fumadocs-mdx': '^14.0.4',
        'fumadocs-ui': '^16.2.2',
        'lucide-react': '^0.552.0',
        next: '^16.0.7',
        react: '^19.2.0',
        'react-dom': '^19.2.0',
        shiki: '^3.0.0',
      },
      devDependencies: {
        '@tailwindcss/postcss': '^4.1.16',
        '@types/node': '^24.10.0',
        '@types/react': '^19.2.2',
        '@types/react-dom': '^19.2.2',
        postcss: '^8.5.6',
        tailwindcss: '^4.1.16',
        typescript: '^5.9.3',
        wrangler: 'latest',
      },
    },
    null,
    2
  )
}
