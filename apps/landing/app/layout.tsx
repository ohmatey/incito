import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/context/ThemeContext'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Incito - Stop rewriting prompts. Start reusing them.',
  description:
    'Your prompts, stored locally. No cloud, no subscription. A simple, fast way to manage your AI prompts.',
  keywords: ['AI', 'prompts', 'prompt management', 'ChatGPT', 'Claude', 'productivity'],
  authors: [{ name: 'Aaron' }],
  openGraph: {
    title: 'Incito - Stop rewriting prompts. Start reusing them.',
    description:
      'Your prompts, stored locally. No cloud, no subscription. A simple, fast way to manage your AI prompts.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Incito - Stop rewriting prompts. Start reusing them.',
    description:
      'Your prompts, stored locally. No cloud, no subscription. A simple, fast way to manage your AI prompts.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
