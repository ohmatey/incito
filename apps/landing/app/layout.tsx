import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/context/ThemeContext'
import { LanguageProvider } from '@/context/LanguageContext'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Incito - Systematize your AI workflows',
  description:
    'Transform complex prompt chains into repeatable, variable-driven workflows. 100% local. Markdown-native. Free and open source.',
  keywords: ['AI', 'prompts', 'prompt management', 'ChatGPT', 'Claude', 'productivity'],
  authors: [{ name: 'Aaron' }],
  openGraph: {
    title: 'Incito - Systematize your AI workflows',
    description:
      'Transform complex prompt chains into repeatable, variable-driven workflows. 100% local. Markdown-native. Free and open source.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Incito - Systematize your AI workflows',
    description:
      'Transform complex prompt chains into repeatable, variable-driven workflows. 100% local. Markdown-native. Free and open source.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#1c1917" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#fafaf9" media="(prefers-color-scheme: light)" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
