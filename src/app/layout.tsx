import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WVF Training',
  description: 'Wayne Veitch Fitness — training app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
