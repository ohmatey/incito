'use client'

import { Target, Layers, GitBranch } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { FadeIn } from '@/components/shared/FadeIn'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

const icons = [Target, Layers, GitBranch]

export function Problem() {
  const { t } = useLanguage()

  return (
    <section className="py-20">
      <Container>
        <FadeIn>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl [text-wrap:balance]">
            {t.problem.heading}
          </h2>
        </FadeIn>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.problem.items.map((problem, index) => {
            const Icon = icons[index]
            return (
              <FadeIn key={index} delay={index * 0.1}>
                <div
                  className={cn(
                    'group relative rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300',
                    'hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5',
                    'dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-800'
                  )}
                >
                  <div className="mb-4 inline-flex rounded-xl bg-gray-100 p-3 text-gray-600 transition-colors group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-primary-900/50 dark:group-hover:text-primary-400">
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {problem.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {problem.description}
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
