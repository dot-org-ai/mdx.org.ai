import { PageProps } from 'waku/router';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { typesSource, propertiesSource } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';

export default function SchemaPage({ slug }: PageProps<'/[slug]'>) {
  // Try to find the page in types first, then properties
  let page = typesSource.getPage([slug]);
  let pageSource = typesSource;

  if (!page) {
    page = propertiesSource.getPage([slug]);
    pageSource = propertiesSource;
  }

  if (!page) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Page Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          The {slug} you are looking for does not exist.
        </p>
      </div>
    );
  }

  const MDX = page.data.body;
  return (
    <DocsLayout {...baseOptions()} tree={pageSource.pageTree}>
      <DocsPage toc={page.data.toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <MDX
            components={{
              ...defaultMdxComponents,
            }}
          />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}

export async function getConfig() {
  // Generate static paths for all types and properties
  const typePages = typesSource
    .generateParams()
    .map((item) => item.slug);

  const propertyPages = propertiesSource
    .generateParams()
    .map((item) => item.slug);

  // Combine and flatten all paths
  const allPaths = [
    ...typePages.map((slugs) => slugs[0]), // Get first segment only for root level pages
    ...propertyPages.map((slugs) => slugs[0]),
  ].filter(Boolean);

  return {
    render: 'static' as const,
    staticPaths: allPaths,
  } as const;
}
