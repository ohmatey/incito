'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { LANGUAGES } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen) {
      const currentIndex = LANGUAGES.findIndex((l) => l.code === language)
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0)
    }
  }, [isOpen, language])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setIsOpen(true)
        }
        return
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          setIsOpen(false)
          break
        case 'ArrowDown':
          event.preventDefault()
          setFocusedIndex((i) => (i + 1) % LANGUAGES.length)
          break
        case 'ArrowUp':
          event.preventDefault()
          setFocusedIndex((i) => (i - 1 + LANGUAGES.length) % LANGUAGES.length)
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          setLanguage(LANGUAGES[focusedIndex].code)
          setIsOpen(false)
          break
      }
    },
    [isOpen, focusedIndex, setLanguage]
  )

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="h-11 w-11 p-0"
      >
        <Globe size={20} aria-hidden="true" />
      </Button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Select language"
          className={cn(
            'absolute right-0 top-full z-50 mt-2 min-w-[160px]',
            'max-h-[min(300px,calc(100vh-120px))] overflow-y-auto overscroll-contain',
            'rounded-lg border border-gray-700 bg-gray-800 shadow-lg'
          )}
        >
          {LANGUAGES.map((lang, index) => (
            <button
              key={lang.code}
              role="menuitem"
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => {
                setLanguage(lang.code)
                setIsOpen(false)
              }}
              onKeyDown={handleKeyDown}
              onMouseEnter={() => setFocusedIndex(index)}
              className={cn(
                'flex w-full min-h-[44px] items-center justify-between gap-3 px-4 text-left text-sm',
                'transition-colors',
                'hover:bg-gray-700 active:bg-gray-600',
                focusedIndex === index && 'bg-gray-700'
              )}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{lang.flag}</span>
                <span className="text-gray-100">{lang.nativeName}</span>
              </span>
              {language === lang.code && (
                <Check size={16} className="text-primary-500" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
