'use client'

import { useState, useEffect } from 'react'
import { Github } from 'lucide-react'
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
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 border-b transition-all duration-300',
        scrolled
          ? 'border-gray-700/50 bg-gray-900/80 backdrop-blur-lg'
          : 'border-transparent bg-transparent'
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-lg font-semibold text-gray-100">
              Incito
            </span>
          </a>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">
                <Github size={18} className="mr-2" aria-hidden="true" />
                {t.header.github}
              </Button>
            </a>
            <a href={DOWNLOAD_URL}>
              <Button size="sm">{t.header.download}</Button>
            </a>
          </div>
        </div>
      </Container>
    </header>
  )
}
