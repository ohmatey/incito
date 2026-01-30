'use client'

import { useState, useEffect } from 'react'
import { Github, Monitor } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/Logo'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useLanguage } from '@/context/LanguageContext'
import { GITHUB_URL, DOWNLOAD_URL } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function Header() {
  const { t } = useLanguage()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)]',
        'transition-[border-color,background-color,backdrop-filter] duration-300',
        scrolled
          ? 'border-gray-700/50 bg-gray-900/80 backdrop-blur-lg'
          : 'border-transparent bg-transparent'
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          <a
            href="/"
            aria-label="Incito - Go to homepage"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            <Logo size={28} />
            <span className="text-lg font-semibold text-gray-100">Incito</span>
          </a>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-3 sm:flex" aria-label="Main navigation">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <Github size={18} aria-hidden="true" />
                <span className="ml-2">{t.header.github}</span>
              </a>
            </Button>
            <Button size="sm" asChild>
              <a href={DOWNLOAD_URL}>
                {t.header.download}
              </a>
            </Button>
          </nav>

          {/* Mobile: show desktop-only indicator + GitHub */}
          <div className="flex items-center gap-2 sm:hidden">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              asChild
              aria-label="View on GitHub"
            >
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <Github size={20} aria-hidden="true" />
              </a>
            </Button>
            <div className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-400">
              <Monitor size={14} aria-hidden="true" />
              <span>Desktop App</span>
            </div>
          </div>
        </div>
      </Container>
    </header>
  )
}
