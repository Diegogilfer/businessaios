import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BusinessAIOS — Executive Dashboard',
  description: 'Multi-Agent AI Business Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
