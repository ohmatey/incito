import { useTranslation } from 'react-i18next'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getLanguageInfo, getLanguageShortCode } from '@/lib/language-detect'
import type { LanguageCode } from '@/types/prompt'

interface LanguageBadgeProps {
  languageCode: LanguageCode
  targetLanguage?: LanguageCode
  size?: 'sm' | 'md'
  showTooltip?: boolean
}

export function LanguageBadge({
  languageCode,
  targetLanguage = 'en',
  size = 'sm',
  showTooltip = true,
}: LanguageBadgeProps) {
  const { t } = useTranslation('translation')

  const langInfo = getLanguageInfo(languageCode)
  const targetInfo = getLanguageInfo(targetLanguage)

  if (!langInfo) return null

  const shortCode = getLanguageShortCode(languageCode)

  const badge = (
    <span
      className={`inline-flex items-center gap-0.5 rounded font-medium ${
        size === 'sm'
          ? 'px-1 py-0.5 text-[10px]'
          : 'px-1.5 py-0.5 text-xs'
      } bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}
    >
      <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>{langInfo.flag}</span>
      <span>{shortCode}</span>
    </span>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p>
            {t('badge.tooltip', {
              language: langInfo.name,
              target: targetInfo?.name || targetLanguage,
            })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
