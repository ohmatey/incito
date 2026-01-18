'use client'

import { Github } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/shared/FadeIn'
import { ScreenshotPlaceholder } from '@/components/shared/ScreenshotPlaceholder'
import { GITHUB_URL, DOWNLOAD_URL } from '@/lib/constants'

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-100/50 via-accent-100/30 to-transparent blur-3xl dark:from-primary-900/20 dark:via-accent-900/10" />
      </div>

      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-6xl">
              Turn prompts into{' '}
              <span className="text-gradient">instructions.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl">
              Build guided forms for your best prompts. Fill in the blanks, copy, paste into any AI.
              Set it up once, reuse forever. 100% offline.
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href={DOWNLOAD_URL}>
                <Button size="lg">Download for macOS</Button>
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="lg">
                  <Github size={20} className="mr-2" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.3} className="mt-16">
          <div className="relative mx-auto max-w-5xl">
            {/* Decorative blur underneath */}
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-accent-500/20 blur-2xl" />
            <ScreenshotPlaceholder
              src="/screenshots/incito-desktop.png"
              alt="Incito desktop application showing prompt editor"
            />
          </div>
        </FadeIn>
      </Container>
    </section>
  )
}
