import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { source } from '@/lib/source'
import Image from 'next/image'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      githubUrl='https://github.com/dot-org-ai/mdx.org.ai'
      links={[
        { text: 'MDX (upstream)', url: 'https://mdxjs.com', external: true },
        { text: 'schema.org.ai', url: 'https://schema.org.ai', external: true },
        { text: 'The Org.AI Foundation', url: 'https://foundation.org.ai', external: true },
      ]}
      nav={{
        title: (
          <>
            <Image src='/org-ai.svg' alt='' width={24} height={24} />
            <span>MDX.org.ai</span>
          </>
        ),
      }}
    >
      {children}
    </DocsLayout>
  )
}
