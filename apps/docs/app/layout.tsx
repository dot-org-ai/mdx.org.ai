import './global.css'
import { RootProvider } from 'fumadocs-ui/provider'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://mdx.org.ai'),
  title: {
    default: 'MDXLD',
    template: '%s — MDX.org.ai',
  },
  description: 'MDXLD is an extension of MDX: $id / $type / $context linked-data frontmatter over the open MDX format authored by the MDX community.',
  alternates: {
    canonical: './',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className='flex flex-col min-h-screen'>
        <RootProvider>{children}</RootProvider>
        <footer className='border-t border-fd-border px-6 py-6 text-sm text-fd-muted-foreground'>
          <p>
            <a href='https://mdxjs.com' className='underline'>
              MDX
            </a>{' '}
            is an open standard authored by the MDX community. MDXLD is an extension of it, maintained by{' '}
            <a href='https://foundation.org.ai' className='underline'>
              The Org.AI Foundation
            </a>
            .
          </p>
          <p className='mt-1 opacity-70'>
            Vocabulary at{' '}
            <a href='https://schema.org.ai' className='underline'>
              schema.org.ai
            </a>{' '}
            &middot; also served at{' '}
            <a href='https://mdxld.org' className='underline'>
              mdxld.org
            </a>{' '}
            &middot; primitives at{' '}
            <a href='https://primitives.org.ai' className='underline'>
              primitives.org.ai
            </a>
          </p>
        </footer>
      </body>
    </html>
  )
}
