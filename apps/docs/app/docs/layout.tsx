import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { source } from '@/lib/source'
import { OrgAiMark } from '@/lib/org-ai-mark'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <>
            <OrgAiMark />
            <span>MDX.org.ai</span>
          </>
        ),
      }}
    >
      {children}
    </DocsLayout>
  )
}
