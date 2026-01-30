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
  title: 'Incito - The prompt engineering platform',
  description:
    'Build, test, compare, and evaluate AI prompts at scale. Create agents, run multi-provider comparisons, grade outputs automatically. Local-first. Free and open source.',
  keywords: [
    'AI',
    'prompts',
    'prompt engineering',
    'ChatGPT',
    'Claude',
    'GPT-4',
    'Gemini',
    'LLM evaluation',
    'AI agents',
    'prompt testing',
  ],
  authors: [{ name: 'Aaron' }],
  openGraph: {
    title: 'Incito - The prompt engineering platform',
    description:
      'Build, test, compare, and evaluate AI prompts at scale. Create agents, run multi-provider comparisons, grade outputs automatically. Local-first. Free and open source.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Incito - The prompt engineering platform',
    description:
      'Build, test, compare, and evaluate AI prompts at scale. Create agents, run multi-provider comparisons, grade outputs automatically. Local-first. Free and open source.',
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
