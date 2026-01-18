'use client'

import { RefreshCw, Search, Clock } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { FadeIn } from '@/components/shared/FadeIn'
import { cn } from '@/lib/utils'

const problems = [
  {
    icon: RefreshCw,
    title: 'Starting from scratch every time',
    description:
      "You've written the perfect prompt before, but now you're typing it out again from memory.",
  },
  {
    icon: Search,
    title: 'No structure for reuse',
    description:
      'Your prompts live in random notes and chat logs. No easy way to turn them into repeatable templates.',
  },
  {
    icon: Clock,
    title: 'Context gets lost',
    description:
      'You remember the prompt worked, but not the exact setup—the variables, the format, the instructions that made it work.',
  },
]

export function Problem() {
  return (
    <section className="py-20">
      <Container>
        <FadeIn>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Sound familiar?
          </h2>
        </FadeIn>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem, index) => (
            <FadeIn key={problem.title} delay={index * 0.1}>
              <div
                className={cn(
                  'group relative rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300',
                  'hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5',
                  'dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-800'
                )}
              >
                <div className="mb-4 inline-flex rounded-xl bg-gray-100 p-3 text-gray-600 transition-colors group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-primary-900/50 dark:group-hover:text-primary-400">
                  <problem.icon size={24} />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {problem.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {problem.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  )
}
