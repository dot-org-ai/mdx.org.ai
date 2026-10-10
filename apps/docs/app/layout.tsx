import './global.css'
import { RootProvider } from 'fumadocs-ui/provider'
import localFont from 'next/font/local'

// Public Sans, the Org.AI Foundation's typeface, served from this site
const publicSans = localFont({ src: './fonts/publicsans-latin.woff2', weight: '100 900', display: 'swap' })

export const metadata = {
  title: 'MDX.org.ai Documentation',
  description: 'The complete MDX ecosystem for building AI-powered applications',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={publicSans.className} suppressHydrationWarning>
      <body>
        {/* dark, as every Org.AI Foundation site is */}
        <RootProvider theme={{ forcedTheme: 'dark', defaultTheme: 'dark', enableSystem: false }}>{children}</RootProvider>
      </body>
    </html>
  )
}
