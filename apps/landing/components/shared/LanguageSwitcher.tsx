'use client'

import { useLanguage } from '@/context/LanguageContext'
import { LANGUAGES } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const currentLang = LANGUAGES.find(l => l.code === language)
  const nextLang = LANGUAGES.find(l => l.code !== language)

  if (!nextLang) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(nextLang.code)}
      title={`Switch to ${nextLang.name}`}
      className="gap-1.5"
    >
      <Globe size={16} />
      <span className="text-xs font-medium">{currentLang?.flag}</span>
    </Button>
  )
}
