import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FolderOpen, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLanguage } from '@/context/LanguageContext'
import { LANGUAGES, type Language } from '@/i18n/types'

interface GeneralTabProps {
  folderPath: string
  onChangeFolder: () => void
}

export function GeneralTab({ folderPath, onChangeFolder }: GeneralTabProps) {
  const { t } = useTranslation(['settings', 'common'])
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  return (
    <div className="space-y-6">
      {/* Storage Path */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('settings:storagePath.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('settings:storagePath.description')}
        </p>
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <code className="flex-1 text-sm text-gray-600 truncate font-mono dark:text-gray-400">
            {folderPath}
          </code>
          <Button variant="secondary" onClick={onChangeFolder} className="gap-2 shrink-0">
            <FolderOpen className="h-4 w-4" />
            {t('common:buttons.changeFolder')}
          </Button>
        </div>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('settings:language.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('settings:language.description')}
        </p>
        <RadioGroup
          value={language}
          onValueChange={(value) => setLanguage(value as Language)}
          className="grid grid-cols-2 gap-3"
        >
          {LANGUAGES.map((lang) => (
            <Label
              key={lang.code}
              htmlFor={`lang-${lang.code}`}
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
            >
              <RadioGroupItem value={lang.code} id={`lang-${lang.code}`} className="sr-only" />
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang.nativeName}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Appearance */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('settings:appearance.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('settings:appearance.description')}
        </p>
        <RadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
          className="grid grid-cols-3 gap-3"
        >
          <Label
            htmlFor="theme-light"
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
          >
            <RadioGroupItem value="light" id="theme-light" className="sr-only" />
            <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings:appearance.light')}
            </span>
          </Label>
          <Label
            htmlFor="theme-dark"
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
          >
            <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
            <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings:appearance.dark')}
            </span>
          </Label>
          <Label
            htmlFor="theme-system"
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
          >
            <RadioGroupItem value="system" id="theme-system" className="sr-only" />
            <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings:appearance.system')}
            </span>
          </Label>
        </RadioGroup>
      </div>
    </div>
  )
}
