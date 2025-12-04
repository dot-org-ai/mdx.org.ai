import './global.css'
import { RootProvider } from 'fumadocs-ui/provider'

export const metadata = {
  title: 'MDX.org.ai Documentation',
  description: 'The complete MDX ecosystem for building AI-powered applications',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
