import { Header } from '@/components/sections/Header'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Features } from '@/components/sections/Features'
import { ChromeExtension } from '@/components/sections/ChromeExtension'
import { FinalCTA } from '@/components/sections/FinalCTA'
import { Footer } from '@/components/sections/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950">
      <Header />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <ChromeExtension />
      <FinalCTA />
      <Footer />
    </main>
  )
}
