'use client'

import { Github } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Logo } from '@/components/shared/Logo'
import { useLanguage } from '@/context/LanguageContext'
import { GITHUB_URL } from '@/lib/constants'

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-gray-200 py-8 dark:border-gray-800">
      <Container>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t.footer.builtBy}{' '}
                <a
                  href="https://www.aaronmcpherson.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-gray-900 hover:underline dark:text-gray-100"
                >
                  Aaron
                </a>
              </span>
            </div>
            <span className="hidden text-gray-300 dark:text-gray-700 sm:inline">|</span>
            <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              {t.footer.openSource}
            </span>
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Github size={18} />
            <span>{t.footer.sourceCode}</span>
          </a>
        </div>
      </Container>
    </footer>
  )
}
