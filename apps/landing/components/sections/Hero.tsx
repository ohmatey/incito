'use client'

import { Github, Monitor, Apple } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/shared/FadeIn'
import { ScreenshotPlaceholder } from '@/components/shared/ScreenshotPlaceholder'
import { useLanguage } from '@/context/LanguageContext'
import { GITHUB_URL, DOWNLOAD_URL } from '@/lib/constants'

export function Hero() {
  const { t } = useLanguage()

  return (
    <section className="relative overflow-hidden pb-20 pt-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-100/50 via-accent-100/30 to-transparent blur-3xl dark:from-primary-900/20 dark:via-accent-900/10" />
      </div>

      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-6xl [text-wrap:balance]">
              {t.hero.title}{' '}
              <span className="text-gradient">{t.hero.titleHighlight}</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl">
              {t.hero.subtitle}
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            {/* Desktop CTA buttons */}
            <div className="mt-10 hidden flex-col items-center justify-center gap-4 sm:flex sm:flex-row">
              <Button size="lg" asChild>
                <a href={DOWNLOAD_URL}>
                  <Apple size={20} className="mr-2" aria-hidden="true" />
                  {t.hero.downloadButton}
                </a>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  <Github size={20} className="mr-2" aria-hidden="true" />
                  {t.hero.githubButton}
                </a>
              </Button>
            </div>

            {/* Mobile: Desktop app notice */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:hidden">
              <div className="flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-800/50 px-6 py-4">
                <Monitor size={24} className="text-primary-500" aria-hidden="true" />
                <div className="text-left">
                  <p className="font-medium text-gray-100">Desktop App for macOS</p>
                  <p className="text-sm text-gray-400">Visit on your Mac to download</p>
                </div>
              </div>
              <Button variant="secondary" size="md" asChild>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  <Github size={20} className="mr-2" aria-hidden="true" />
                  {t.hero.githubButton}
                </a>
              </Button>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.3} className="mt-16">
          <div className="relative mx-auto max-w-5xl">
            {/* Decorative blur underneath */}
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-accent-500/20 blur-2xl" />
            <ScreenshotPlaceholder
              src="/screenshots/incito-desktop.png"
              alt={t.hero.screenshotAlt}
            />
          </div>
        </FadeIn>
      </Container>
    </section>
  )
}
