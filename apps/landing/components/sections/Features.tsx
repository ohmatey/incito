'use client'

import { HardDrive, Zap, Braces, Sparkles, Keyboard, Paintbrush } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { FadeIn } from '@/components/shared/FadeIn'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: HardDrive,
    title: '100% Offline',
    description: 'Works completely offline. Your prompts never leave your machine—no internet required, no cloud sync, no accounts.',
    color: 'primary',
  },
  {
    icon: Zap,
    title: 'Instant',
    description: 'Native app performance. Opens in milliseconds, not seconds. No loading spinners.',
    color: 'secondary',
  },
  {
    icon: Braces,
    title: 'Handlebars Templating',
    description: 'Use {{variables}}, conditionals, and helpers. Your prompts become smart templates.',
    color: 'accent',
  },
  {
    icon: Sparkles,
    title: 'Bring Your Own AI (Optional)',
    description: 'Connect an AI provider if you want help generating prompts. Or skip it—the app works fully standalone.',
    color: 'primary',
  },
  {
    icon: Keyboard,
    title: 'Keyboard-first',
    description: 'Navigate, search, and copy without touching your mouse. Shortcuts for everything.',
    color: 'secondary',
  },
  {
    icon: Paintbrush,
    title: 'Clean UI',
    description: 'A distraction-free interface that gets out of your way. Light and dark modes included.',
    color: 'accent',
  },
]

const colorClasses = {
  primary: {
    bg: 'bg-primary-100 dark:bg-primary-900/30',
    text: 'text-primary-600 dark:text-primary-400',
  },
  secondary: {
    bg: 'bg-secondary-100 dark:bg-secondary-900/30',
    text: 'text-secondary-600 dark:text-secondary-400',
  },
  accent: {
    bg: 'bg-accent-100 dark:bg-accent-900/30',
    text: 'text-accent-600 dark:text-accent-400',
  },
}

export function Features() {
  return (
    <section className="py-20">
      <Container>
        <FadeIn>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Everything you need, nothing you don&apos;t
          </h2>
        </FadeIn>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const colors = colorClasses[feature.color as keyof typeof colorClasses]
            return (
              <FadeIn key={feature.title} delay={index * 0.05}>
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div
                    className={cn(
                      'mb-4 inline-flex rounded-xl p-3',
                      colors.bg,
                      colors.text
                    )}
                  >
                    <feature.icon size={24} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
