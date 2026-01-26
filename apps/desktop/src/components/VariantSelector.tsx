import type { PromptFile } from '@/types/prompt'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil } from 'lucide-react'
import { getVariantFamily } from '@/lib/prompts'
import { useTranslation } from 'react-i18next'

interface VariantSelectorProps {
  prompt: PromptFile
  allPrompts: PromptFile[]
  onSelectVariant: (prompt: PromptFile) => void
  onNewVariant: () => void
  onEditPrompt: () => void
}

export function VariantSelector({
  prompt,
  allPrompts,
  onSelectVariant,
  onNewVariant,
  onEditPrompt,
}: VariantSelectorProps) {
  const { t } = useTranslation(['prompts'])
  const variantFamily = getVariantFamily(prompt, allPrompts)

  // Only show the selector if there's more than just the current prompt
  // or if the prompt has variants (is a parent) or is a variant itself
  const hasVariants = variantFamily.length > 1 || prompt.variants?.length || prompt.variantOf

  // Get display label for a prompt in the variant family
  const getVariantLabel = (p: PromptFile, index: number) => {
    if (index === 0 && !p.variantOf) {
      return t('prompts:variantSelector.original')
    }
    // Extract variant label from the name (e.g., "Prompt Name (Formal)" -> "Formal")
    const match = p.name.match(/\(([^)]+)\)$/)
    if (match) {
      return match[1]
    }
    // Fallback to extracting from filename
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
    <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800/50">
      {hasVariants ? (
        <Select
          value={prompt.id}
          onValueChange={(value) => {
            const selected = variantFamily.find(p => p.id === value)
            if (selected) {
              onSelectVariant(selected)
            }
          }}
        >
          <SelectTrigger className="w-[180px] h-8 bg-white dark:bg-gray-800">
            <SelectValue placeholder={t('prompts:variantSelector.selectVariant')} />
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
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('prompts:variantSelector.original')}
        </span>
      )}

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onEditPrompt}
        className="gap-1.5 h-8"
      >
        <Pencil className="h-4 w-4" />
        {t('prompts:variantSelector.edit')}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onNewVariant}
        className="gap-1.5 h-8"
      >
        <Plus className="h-4 w-4" />
        {t('prompts:variantSelector.newVariant')}
      </Button>
    </div>
  )
}
