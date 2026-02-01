'use client'

import {
  Bot,
  Play,
  GitCompare,
  CheckCircle,
  BookMarked,
  Layers,
  Wrench,
  Database,
  Plug,
  FlaskConical,
  LucideIcon,
} from 'lucide-react'
import { Container } from '@/components/ui/container'
import { FadeIn } from '@/components/shared/FadeIn'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

const experimentIcons: LucideIcon[] = [Bot, Play, GitCompare, CheckCircle, BookMarked, Layers, Wrench, Database, Plug]

export function Experiments() {
  const { t } = useLanguage()

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <Container>
        <FadeIn>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium mb-4">
              <FlaskConical size={16} aria-hidden="true" />
              <span>Experimental</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl [text-wrap:balance]">
              {t.experiments.heading}
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
              {t.experiments.subheading}
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.experiments.items.map((experiment, index) => {
            const Icon = experimentIcons[index]
            return (
              <FadeIn key={index} delay={index * 0.05}>
                <div className="relative rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 h-full flex flex-col">
                  {/* Experimental badge glow */}
                  <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

                  <div
                    className={cn(
                      'mb-4 inline-flex rounded-xl p-3 w-fit',
                      'bg-amber-100 dark:bg-amber-900/30',
                      'text-amber-600 dark:text-amber-400'
                    )}
                  >
                    <Icon size={24} aria-hidden="true" />
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {experiment.title}
                  </h3>

                  <p className="text-gray-600 dark:text-gray-400">
                    {experiment.description}
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
