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
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t.footer.madeBy}
            </span>
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Github size={20} />
          </a>
        </div>
      </Container>
    </footer>
  )
}
