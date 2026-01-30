import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAllGraders, seedBuiltinGraders } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Code, Brain, Loader2 } from 'lucide-react'
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
      // Only show enabled graders
      setGraders(result.data.filter(g => g.enabled))
    }
    setIsLoading(false)
  }

  const assertionGraders = useMemo(() =>
    graders.filter(g => isAssertionGrader(g)),
    [graders]
  )

  const llmJudgeGraders = useMemo(() =>
    graders.filter(g => !isAssertionGrader(g)),
    [graders]
  )

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

      <ScrollArea className="max-h-[200px]">
        <div className="space-y-3">
          {/* Assertions */}
          {assertionGraders.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-1 py-1">
                <Code className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('list.assertions')}
                </span>
              </div>
              <div className="space-y-1">
                {assertionGraders.map((grader) => (
                  <GraderCheckbox
                    key={grader.id}
                    grader={grader}
                    checked={selectedIds.includes(grader.id)}
                    onCheckedChange={() => handleToggle(grader.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* LLM Judges */}
          {llmJudgeGraders.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-1 py-1">
                <Brain className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('list.llmJudges')}
                </span>
              </div>
              <div className="space-y-1">
                {llmJudgeGraders.map((grader) => (
                  <GraderCheckbox
                    key={grader.id}
                    grader={grader}
                    checked={selectedIds.includes(grader.id)}
                    onCheckedChange={() => handleToggle(grader.id)}
                  />
                ))}
              </div>
            </div>
          )}
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

function GraderCheckbox({ grader, checked, onCheckedChange }: GraderCheckboxProps) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
      <Checkbox
        id={grader.id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Label
        htmlFor={grader.id}
        className="flex-1 cursor-pointer text-sm font-normal"
      >
        {grader.name}
      </Label>
    </div>
  )
}
