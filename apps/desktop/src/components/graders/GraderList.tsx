import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getAllGraders, createGrader, seedBuiltinGraders } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GraderListItem } from './GraderListItem'
import { CreateGraderDialog } from './CreateGraderDialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Search, Loader2, Filter, CheckCircle2 } from 'lucide-react'
import type { Grader, AssertionGrader, LLMJudgeGrader } from '@/types/grader'
import { isAssertionGrader } from '@/types/grader'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'quick' | 'ai' | 'active' | 'inactive'

export function GraderList() {
  const { t } = useTranslation('graders')
  const navigate = useNavigate()
  const { graderId } = useParams({ strict: false })

  const [graders, setGraders] = useState<Grader[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadGraders()
  }, [])

  async function loadGraders() {
    setIsLoading(true)
    // Seed built-in graders if needed
    await seedBuiltinGraders()
    const result = await getAllGraders()
    if (result.ok) {
      setGraders(result.data)
    } else {
      toast.error(t('errors.loadFailed'))
    }
    setIsLoading(false)
  }

  // Filter and sort graders alphabetically in a flat list
  const filteredGraders = useMemo(() => {
    let filtered = graders

    // Apply type/status filter
    switch (filter) {
      case 'quick':
        filtered = filtered.filter(g => isAssertionGrader(g))
        break
      case 'ai':
        filtered = filtered.filter(g => !isAssertionGrader(g))
        break
      case 'active':
        filtered = filtered.filter(g => g.enabled)
        break
      case 'inactive':
        filtered = filtered.filter(g => !g.enabled)
        break
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(query) ||
        g.description?.toLowerCase().includes(query)
      )
    }

    // Sort alphabetically by name (spread + sort for immutability)
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [graders, searchQuery, filter])

  async function handleCreate(grader: Omit<AssertionGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'> | Omit<LLMJudgeGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'>) {
    const result = await createGrader(grader)
    if (result.ok) {
      toast.success(t('success.created'))
      setShowCreateDialog(false)
      await loadGraders()
      navigate({ to: '/graders/$graderId', params: { graderId: result.data.id } })
    } else {
      toast.error(t('errors.createFailed'))
    }
  }

  function handleSelect(grader: Grader) {
    navigate({ to: '/graders/$graderId', params: { graderId: grader.id } })
  }

  const isFiltered = filter !== 'all'

  return (
    <div className="flex h-full w-[280px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('list.title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowCreateDialog(true)}
          className="h-8 w-8"
          aria-label={t('create.button')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              name="grader-search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('list.searchPlaceholder')}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0",
                  isFiltered && "text-primary-600 dark:text-primary-400"
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>{t('list.filter.title')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <DropdownMenuRadioItem value="all">{t('list.filter.all')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="quick">{t('list.filter.quickChecks')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="ai">{t('list.filter.aiReviews')}</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="active">{t('list.filter.active')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="inactive">{t('list.filter.inactive')}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* List - Flat structure, no categories */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : filteredGraders.length === 0 ? (
          <EmptyState
            variant="inline"
            icon={CheckCircle2}
            title={searchQuery || isFiltered ? t('list.empty') : t('list.createFirst')}
            action={
              !searchQuery && !isFiltered
                ? {
                    label: t('create.button'),
                    onClick: () => setShowCreateDialog(true),
                    icon: Plus,
                    variant: 'outline',
                  }
                : undefined
            }
          />
        ) : (
          <div className="p-2 space-y-1">
            {filteredGraders.map((grader) => (
              <GraderListItem
                key={grader.id}
                grader={grader}
                isSelected={grader.id === graderId}
                onClick={() => handleSelect(grader)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create Dialog */}
      <CreateGraderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
      />
    </div>
  )
}
