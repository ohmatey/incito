'use client'

import { Github } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/shared/FadeIn'
import { useLanguage } from '@/context/LanguageContext'
import { DOWNLOAD_URL, GITHUB_URL } from '@/lib/constants'

export function FinalCTA() {
  const { t } = useLanguage()

  return (
    <section className="bg-gray-900 py-20 dark:bg-gray-950">
      <Container>
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl [text-wrap:balance]">
              {t.cta.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              {t.cta.subheading}
            </p>
            <div className="mt-8 flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <a href={DOWNLOAD_URL}>
                  <Button
                    size="lg"
                    className="bg-white text-gray-900 hover:bg-gray-100"
                  >
                    {t.cta.downloadButton}
                  </Button>
                </a>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
                  >
                    <Github size={20} className="mr-2" aria-hidden="true" />
                    {t.cta.githubButton}
                  </Button>
                </a>
              </div>
              <p className="text-sm font-medium text-primary-400">
                {t.cta.freeForever}
              </p>
              <p className="text-sm text-gray-500">
                {t.cta.comingSoon}
              </p>
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  )
}
