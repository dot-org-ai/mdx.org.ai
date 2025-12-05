import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { source } from '@/lib/source'
import Image from 'next/image'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <>
            <Image src="/org-ai.svg" alt="" width={24} height={24} />
            <span>MDX.org.ai</span>
          </>
        ),
      }}
    >
      {children}
    </DocsLayout>
  )
}
