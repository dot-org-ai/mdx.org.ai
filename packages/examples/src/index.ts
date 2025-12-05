/**
 * @mdxui/examples
 *
 * Example sites and applications for @mdxui layouts
 */

// Site components and data
export { AgenticSite, agenticData } from './sites/agentic'
export { ApiHtSite, apiHtData } from './sites/api-ht'
export { DbHtSite, dbHtData } from './sites/db-ht'
export { ScrapeSite, scrapeData } from './sites/scrape'
export { WorkflowSite, workflowData } from './sites/workflow'
export { HeadlessSite, headlessData } from './sites/headless'
export { AdvertisSite, advertisData } from './sites/advertis'
export { MarktSite, marktData } from './sites/markt'

// Site registry for auto-generation
export {
  siteRegistry,
  getSitesByLayout,
  getSitesByPackage,
  getSiteById,
  getSiteByDomain,
  type SiteEntry,
  type LayoutType,
} from './sites'
