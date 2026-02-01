import { useState, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAllPlaybooks } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import type { Playbook } from '@/types/playbook'
import { cn } from '@/lib/utils'

interface PlaybookSelectorProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  className?: string
}

export function PlaybookSelector({
  selectedIds,
  onSelectionChange,
  className,
}: PlaybookSelectorProps) {
  const { t } = useTranslation('playbooks')
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPlaybooks()
  }, [])

  async function loadPlaybooks() {
    setIsLoading(true)
    const result = await getAllPlaybooks()
    if (result.ok) {
      // Only show enabled playbooks, sorted alphabetically
      const enabled = result.data.filter(p => p.enabled)
      setPlaybooks([...enabled].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setIsLoading(false)
  }

  function handleToggle(playbookId: string) {
    if (selectedIds.includes(playbookId)) {
      onSelectionChange(selectedIds.filter(id => id !== playbookId))
    } else {
      onSelectionChange([...selectedIds, playbookId])
    }
  }

  function handleSelectAll() {
    onSelectionChange(playbooks.map(p => p.id))
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

  if (playbooks.length === 0) {
    return (
      <div className={cn('text-sm text-gray-500 dark:text-gray-400 py-4 text-center', className)}>
        {t('selector.noPlaybooks')}
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
          {playbooks.map((playbook) => (
            <PlaybookCheckbox
              key={playbook.id}
              playbook={playbook}
              checked={selectedIds.includes(playbook.id)}
              onCheckedChange={() => handleToggle(playbook.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface PlaybookCheckboxProps {
  playbook: Playbook
  checked: boolean
  onCheckedChange: () => void
}

// Memoized to prevent re-renders when other checkboxes change
const PlaybookCheckbox = memo(function PlaybookCheckbox({ playbook, checked, onCheckedChange }: PlaybookCheckboxProps) {
  const { t } = useTranslation('playbooks')

  return (
    <div className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
      <Checkbox
        id={playbook.id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <Label
        htmlFor={playbook.id}
        className="flex-1 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
            {playbook.name}
          </span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {t('selector.rulesCount', { count: playbook.ruleCount })}
          </Badge>
        </div>
        {/* One-line description */}
        {playbook.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {playbook.description}
          </p>
        )}
      </Label>
    </div>
  )
})
