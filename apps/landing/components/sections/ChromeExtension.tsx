'use client'

import { Chrome } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { FadeIn } from '@/components/shared/FadeIn'
import { useLanguage } from '@/context/LanguageContext'

export function ChromeExtension() {
  const { t } = useLanguage()

  return (
    <section className="py-20">
      <Container>
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 sm:p-12 lg:p-16">
            {/* Background decorative elements */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              {/* Chrome icon with glow effect */}
              <div className="mb-6 inline-flex rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <Chrome size={48} className="text-white" aria-hidden="true" />
              </div>

              <h2 className="text-3xl font-bold text-white sm:text-4xl [text-wrap:balance]">
                {t.chromeExtension.heading}
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
                {t.chromeExtension.subheading}
              </p>

              <div className="mt-8">
                <span className="inline-flex items-center rounded-full bg-primary-500/20 px-6 py-3 text-sm font-medium text-primary-300 ring-1 ring-primary-500/30">
                  {t.chromeExtension.comingSoon}
                </span>
              </div>
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  )
}
