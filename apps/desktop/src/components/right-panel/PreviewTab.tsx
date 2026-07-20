import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PromptFile } from '@/types/prompt'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { getVariantFamily } from '@/lib/prompts'
import { PromptPreview } from '@/components/preview/PromptPreview'

interface PreviewTabProps {
  prompt: PromptFile | null
  allPrompts: PromptFile[]
  values: Record<string, unknown>
  activeVariableKey: string | null
  onActiveVariableChange: (key: string | null) => void
  onSelectVariant?: (prompt: PromptFile) => void
  onNewVariant?: () => void
}

export function PreviewTab({
  prompt,
  allPrompts,
  values,
  activeVariableKey,
  onActiveVariableChange,
  onSelectVariant,
  onNewVariant,
}: PreviewTabProps) {
  const { t } = useTranslation(['prompts'])

  // Get variant family for this prompt
  const variantFamily = useMemo(() => {
    if (!prompt) return []
    return getVariantFamily(prompt, allPrompts)
  }, [prompt, allPrompts])

  const hasVariants = variantFamily.length > 1

  // Get display label for a prompt in the variant family
  const getVariantLabel = (p: PromptFile, index: number) => {
    if (index === 0 && !p.variantOf) {
      return t('prompts:previewTab.original')
    }
    const match = p.name.match(/\(([^)]+)\)$/)
    if (match) return match[1]
    const fileMatch = p.fileName.match(/--([^.]+)\.md$/)
    if (fileMatch) {
      return fileMatch[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    return p.name
  }

  return (
    <div className="flex h-full flex-col">
      {/* Variant Bar */}
      <div className="shrink-0 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          {/* Variant Selector */}
          {hasVariants && onSelectVariant ? (
            <Select
              value={prompt?.id}
              onValueChange={(value) => {
                const selected = variantFamily.find(p => p.id === value)
                if (selected) onSelectVariant(selected)
              }}
            >
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {variantFamily.map((p, index) => (
                  <SelectItem key={p.id} value={p.id}>
                    {getVariantLabel(p, index)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="flex-1 text-xs text-gray-600 dark:text-gray-400">
              {hasVariants && prompt ? getVariantLabel(prompt, variantFamily.indexOf(prompt)) : t('prompts:previewTab.original')}
            </span>
          )}

          {/* New Variant Button */}
          {onNewVariant && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={onNewVariant}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('prompts:previewTab.new')}
            </Button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <PromptPreview
        prompt={prompt}
        values={values}
        activeVariableKey={activeVariableKey}
        onActiveVariableChange={onActiveVariableChange}
      />
    </div>
  )
}
