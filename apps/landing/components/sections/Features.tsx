'use client'

import { HardDrive, Zap, Braces, Sparkles, Keyboard, Paintbrush, GitBranch, LucideIcon } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { FadeIn } from '@/components/shared/FadeIn'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

const featureIcons: LucideIcon[] = [HardDrive, Zap, Braces, GitBranch, Sparkles, Keyboard, Paintbrush]
const featureColors = ['primary', 'secondary', 'accent', 'primary', 'primary', 'secondary', 'accent']

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
  const { t } = useLanguage()

  return (
    <section className="py-20">
      <Container>
        <FadeIn>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">
            {t.features.heading}
          </h2>
        </FadeIn>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((feature, index) => {
            const Icon = featureIcons[index]
            const color = featureColors[index]
            const colors = colorClasses[color as keyof typeof colorClasses]
            return (
              <FadeIn key={index} delay={index * 0.05}>
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div
                    className={cn(
                      'mb-4 inline-flex rounded-xl p-3',
                      colors.bg,
                      colors.text
                    )}
                  >
                    <Icon size={24} />
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
