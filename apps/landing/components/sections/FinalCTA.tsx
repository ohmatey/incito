'use client'

import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/shared/FadeIn'
import { DOWNLOAD_URL } from '@/lib/constants'

export function FinalCTA() {
  return (
    <section className="bg-gray-900 py-20 dark:bg-gray-950">
      <Container>
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Build your prompt instructions today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              Create guided forms for your best prompts. Come back, fill in the blanks, copy. Free and offline.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <a href={DOWNLOAD_URL}>
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100"
                >
                  Download for macOS
                </Button>
              </a>
              <p className="text-sm text-gray-500">
                Windows and Linux coming soon
              </p>
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  )
}
