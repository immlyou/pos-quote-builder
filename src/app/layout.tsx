import type { Metadata } from 'next'
import './globals.css'
import { ClientProviders } from '@/components/ClientProviders'

export const metadata: Metadata = {
  title: 'POS Quote Builder',
  description: 'Internal quote configurator for Partner Tech POS products',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
