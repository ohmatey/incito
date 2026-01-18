'use client'

import { Container } from '@/components/ui/container'
import { FadeIn } from '@/components/shared/FadeIn'
import { ScreenshotPlaceholder } from '@/components/shared/ScreenshotPlaceholder'

const steps = [
  {
    number: '1',
    title: 'Point to a folder',
    description:
      'Pick any folder. Incito reads your markdown prompt files from there.',
    screenshot: '/screenshots/incito-select-folder.png',
  },
  {
    number: '2',
    title: 'Build your instructions',
    description:
      'Define the questions and inputs that guide prompt creation. Labels, defaults, dropdowns—Incito turns them into a form.',
    screenshot: '/screenshots/incito-build-instructions.png',
  },
  {
    number: '3',
    title: 'Fill in the blanks',
    description:
      "Come back anytime. Your instructions guide you through filling out the prompt without needing to see the template.",
    screenshot: '/screenshots/incito-fill-prompt-instructions.png',
  },
  {
    number: '4',
    title: 'Copy and paste',
    description:
      'One click copies your completed prompt. Paste it into any AI chatbot.',
    screenshot: '/screenshots/incito-copy-prompt.png',
  },
]

export function HowItWorks() {
  return (
    <section className="bg-gray-50 py-20 dark:bg-gray-900/50">
      <Container>
        <FadeIn>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">
            How it works
          </h2>
        </FadeIn>

        <div className="mt-16 space-y-24">
          {steps.map((step, index) => (
            <FadeIn key={step.number} delay={index * 0.1}>
              <div
                className={`flex flex-col items-center gap-12 lg:flex-row ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className="flex-1 space-y-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
                    {step.number}
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
                    src={step.screenshot}
                    alt={`Step ${step.number}: ${step.title}`}
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
