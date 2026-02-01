import { useState, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAllGraders, seedBuiltinGraders } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Loader2 } from 'lucide-react'
import type { Grader } from '@/types/grader'
import { isAssertionGrader } from '@/types/grader'
import { cn } from '@/lib/utils'

interface GraderSelectorProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  className?: string
}

export function GraderSelector({
  selectedIds,
  onSelectionChange,
  className,
}: GraderSelectorProps) {
  const { t } = useTranslation('graders')
  const [graders, setGraders] = useState<Grader[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadGraders()
  }, [])

  async function loadGraders() {
    setIsLoading(true)
    await seedBuiltinGraders()
    const result = await getAllGraders()
    if (result.ok) {
      // Only show enabled graders, sorted alphabetically (spread + sort for immutability)
      const enabled = result.data.filter(g => g.enabled)
      setGraders([...enabled].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setIsLoading(false)
  }

  function handleToggle(graderId: string) {
    if (selectedIds.includes(graderId)) {
      onSelectionChange(selectedIds.filter(id => id !== graderId))
    } else {
      onSelectionChange([...selectedIds, graderId])
    }
  }

  function handleSelectAll() {
    onSelectionChange(graders.map(g => g.id))
  }

  function handleClearAll() {
    onSelectionChange([])
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-4', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (graders.length === 0) {
    return (
      <div className={cn('text-sm text-gray-500 dark:text-gray-400 py-4 text-center', className)}>
        {t('selector.noGraders')}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('selector.selected', { count: selectedIds.length })}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-6 text-xs"
          >
            {t('selector.selectAll')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 text-xs"
            disabled={selectedIds.length === 0}
          >
            {t('selector.clearAll')}
          </Button>
        </div>
      </div>

      {/* Flat list with descriptions */}
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-1">
          {graders.map((grader) => (
            <GraderCheckbox
              key={grader.id}
              grader={grader}
              checked={selectedIds.includes(grader.id)}
              onCheckedChange={() => handleToggle(grader.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface GraderCheckboxProps {
  grader: Grader
  checked: boolean
  onCheckedChange: () => void
}

// Memoized to prevent re-renders when other checkboxes change (rerender-memo rule)
const GraderCheckbox = memo(function GraderCheckbox({ grader, checked, onCheckedChange }: GraderCheckboxProps) {
  const { t } = useTranslation('graders')
  const isAssertion = isAssertionGrader(grader)

  return (
    <div className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
      <Checkbox
        id={grader.id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <Label
        htmlFor={grader.id}
        className="flex-1 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
            {grader.name}
          </span>
          {/* Show AI badge for LLM judges */}
          {!isAssertion && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 gap-0.5">
              <Sparkles className="h-2.5 w-2.5" />
              {t('selector.aiBadge')}
            </Badge>
          )}
        </div>
        {/* One-line description */}
        {grader.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {grader.description}
          </p>
        )}
      </Label>
    </div>
  )
})
