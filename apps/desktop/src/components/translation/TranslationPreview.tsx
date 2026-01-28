import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, RefreshCw, ChevronDown, Copy, Check, Database } from 'lucide-react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { toast } from 'sonner'
import { getLanguageInfo } from '@/lib/language-detect'
import type { LanguageCode, TranslationConfidence } from '@/types/prompt'
import type { TranslationResultData } from '@/lib/mastra-client'

export interface TranslationPreviewProps {
  isOpen: boolean
  onClose: () => void
  originalText: string
  sourceLanguage: LanguageCode
  targetLanguage: LanguageCode
  translationResult: TranslationResultData | null
  isTranslating: boolean
  translationError: string | null
  onRegenerate: () => void
  onCopyOriginal: () => void
  onCopyTranslated: (text: string) => void
  onLaunch?: (text: string, launcher: string) => void
  launchers?: string[]
}

const ConfidenceBadge = memo(function ConfidenceBadge({ confidence }: { confidence: TranslationConfidence }) {
  const { t } = useTranslation('translation')

  const config = useMemo(() => ({
    high: {
      label: t('preview.confidenceHigh'),
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      barWidth: 'w-full',
    },
    medium: {
      label: t('preview.confidenceMedium'),
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      barWidth: 'w-2/3',
    },
    low: {
      label: t('preview.confidenceLow'),
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      barWidth: 'w-1/3',
    },
  }), [t])

  const c = config[confidence]

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{t('preview.confidence')}:</span>
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${c.barWidth} ${confidence === 'high' ? 'bg-green-500' : confidence === 'medium' ? 'bg-yellow-500' : 'bg-red-500'} rounded-full`} />
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded ${c.color}`}>{c.label}</span>
      </div>
    </div>
  )
})

export function TranslationPreview({
  isOpen,
  onClose,
  originalText,
  sourceLanguage,
  targetLanguage,
  translationResult,
  isTranslating,
  translationError,
  onRegenerate,
  onCopyOriginal,
  onCopyTranslated,
  onLaunch,
  launchers = [],
}: TranslationPreviewProps) {
  const { t } = useTranslation('translation')
  const [editedTranslation, setEditedTranslation] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [copiedOriginal, setCopiedOriginal] = useState(false)
  const [copiedTranslated, setCopiedTranslated] = useState(false)

  // Memoize language info lookups
  const sourceLang = useMemo(() => getLanguageInfo(sourceLanguage), [sourceLanguage])
  const targetLang = useMemo(() => getLanguageInfo(targetLanguage), [targetLanguage])

  // Reset edited translation when result changes
  useEffect(() => {
    if (translationResult) {
      setEditedTranslation(translationResult.translated)
      setIsEditing(false)
    }
  }, [translationResult])

  const handleCopyOriginal = useCallback(async () => {
    await writeText(originalText)
    setCopiedOriginal(true)
    onCopyOriginal()
    toast.success(t('common:toasts.copied'))
    setTimeout(() => setCopiedOriginal(false), 2000)
  }, [originalText, onCopyOriginal, t])

  const handleCopyTranslated = useCallback(async () => {
    const textToCopy = isEditing ? editedTranslation : (translationResult?.translated || '')
    await writeText(textToCopy)
    setCopiedTranslated(true)
    onCopyTranslated(textToCopy)
    toast.success(t('common:toasts.copied'))
    setTimeout(() => setCopiedTranslated(false), 2000)
  }, [isEditing, editedTranslation, translationResult, onCopyTranslated, t])

  const handleLaunch = useCallback((launcher: string) => {
    const textToLaunch = isEditing ? editedTranslation : (translationResult?.translated || '')
    onLaunch?.(textToLaunch, launcher)
    onClose()
  }, [isEditing, editedTranslation, translationResult, onLaunch, onClose])


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('preview.title')}
            {translationResult?.fromCache && (
              <span className="flex items-center gap-1 text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                <Database className="h-3 w-3" />
                {t('preview.fromCache')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* Original Text */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{sourceLang?.flag}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('preview.original')} ({sourceLang?.nativeName})
              </span>
            </div>
            <ScrollArea className="flex-1 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <pre className="p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {originalText}
              </pre>
            </ScrollArea>
          </div>

          {/* Translated Text */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{targetLang?.flag}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('preview.translated')} ({targetLang?.nativeName})
              </span>
            </div>
            <ScrollArea className="flex-1 border rounded-lg bg-gray-50 dark:bg-gray-900">
              {isTranslating ? (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('preview.translating')}
                    </span>
                  </div>
                </div>
              ) : translationError ? (
                <div className="p-4 text-sm text-red-600 dark:text-red-400">
                  {translationError}
                </div>
              ) : isEditing ? (
                <Textarea
                  value={editedTranslation}
                  onChange={(e) => setEditedTranslation(e.target.value)}
                  className="h-full min-h-[200px] resize-none border-0 bg-transparent font-mono text-sm"
                  placeholder={t('preview.editPlaceholder')}
                />
              ) : (
                <pre className="p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {translationResult?.translated || ''}
                </pre>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Confidence and Edit Controls */}
        {translationResult && !isTranslating && (
          <div className="flex items-center justify-between py-2 border-t dark:border-gray-700">
            <div className="flex items-center gap-4">
              <ConfidenceBadge confidence={translationResult.confidence} />
              {translationResult.preservedTerms.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{t('preview.preservedTerms')}:</span>{' '}
                  {translationResult.preservedTerms.slice(0, 5).join(', ')}
                  {translationResult.preservedTerms.length > 5 && '...'}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isTranslating}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('preview.regenerate')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? t('common:buttons.done') : t('preview.editTranslation')}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('preview.cancel')}
          </Button>
          <Button variant="secondary" onClick={handleCopyOriginal} className="gap-1.5">
            {copiedOriginal ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {t('preview.copyOriginal')}
          </Button>
          <Button
            onClick={handleCopyTranslated}
            disabled={!translationResult || isTranslating}
            className="gap-1.5"
          >
            {copiedTranslated ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {t('preview.copyTranslated')}
          </Button>
          {onLaunch && launchers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  disabled={!translationResult || isTranslating}
                  className="gap-1.5"
                >
                  {t('preview.launchWith')}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {launchers.map((launcher) => (
                  <DropdownMenuItem
                    key={launcher}
                    onClick={() => handleLaunch(launcher)}
                  >
                    {launcher}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
