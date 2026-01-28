'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { LANGUAGES } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Globe, Check } from 'lucide-react'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        title="Change language"
        className="h-9 w-9 p-0"
      >
        <Globe size={18} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-lg border border-gray-700 bg-gray-800 shadow-lg">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code)
                setIsOpen(false)
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-700"
            >
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span className="text-gray-100">{lang.nativeName}</span>
              </span>
              {language === lang.code && (
                <Check size={16} className="text-primary-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
