'use client'

import { Container } from '@/components/ui/container'
import { FadeIn } from '@/components/shared/FadeIn'
import { ScreenshotPlaceholder } from '@/components/shared/ScreenshotPlaceholder'
import { useLanguage } from '@/context/LanguageContext'

const screenshots = [
  '/screenshots/incito-select-folder.png',
  '/screenshots/incito-build-instructions.png',
  '/screenshots/incito-fill-prompt-instructions.png',
  '/screenshots/incito-copy-prompt.png',
]

export function HowItWorks() {
  const { t } = useLanguage()

  return (
    <section className="bg-gray-50 py-20 dark:bg-gray-900/50">
      <Container>
        <FadeIn>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl [text-wrap:balance]">
            {t.howItWorks.heading}
          </h2>
        </FadeIn>

        <div className="mt-16 space-y-24">
          {t.howItWorks.steps.map((step, index) => (
            <FadeIn key={index} delay={index * 0.1}>
              <div
                className={`flex flex-col items-center gap-12 lg:flex-row ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className="flex-1 space-y-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
                    {step.step}
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {step.title}
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
                <div className="flex-1">
                  <ScreenshotPlaceholder
                    className="mx-auto max-w-lg"
                    src={screenshots[index]}
                    alt={`Step ${step.step}: ${step.title}`}
                  />
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  )
}
