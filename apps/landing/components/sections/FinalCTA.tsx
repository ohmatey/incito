'use client'

import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/shared/FadeIn'
import { useLanguage } from '@/context/LanguageContext'
import { DOWNLOAD_URL } from '@/lib/constants'

export function FinalCTA() {
  const { t } = useLanguage()

  return (
    <section className="bg-gray-900 py-20 dark:bg-gray-950">
      <Container>
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              {t.cta.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              {t.cta.subheading}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <a href={DOWNLOAD_URL}>
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100"
                >
                  {t.cta.downloadButton}
                </Button>
              </a>
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
