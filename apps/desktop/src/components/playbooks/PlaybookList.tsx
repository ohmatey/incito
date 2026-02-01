import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getAllPlaybooks, createPlaybook } from '@/lib/store'
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
import { PlaybookListItem } from './PlaybookListItem'
import { CreatePlaybookDialog } from './CreatePlaybookDialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Search, Loader2, Filter, BookOpen } from 'lucide-react'
import type { Playbook, CreatePlaybookData } from '@/types/playbook'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'active' | 'inactive'

export function PlaybookList() {
  const { t } = useTranslation('playbooks')
  const navigate = useNavigate()
  const { playbookId } = useParams({ strict: false })

  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadPlaybooks()
  }, [])

  async function loadPlaybooks() {
    setIsLoading(true)
    const result = await getAllPlaybooks()
    if (result.ok) {
      setPlaybooks(result.data)
    } else {
      toast.error(t('errors.loadFailed'))
    }
    setIsLoading(false)
  }

  // Filter and sort playbooks alphabetically
  const filteredPlaybooks = useMemo(() => {
    let filtered = playbooks

    // Apply status filter
    switch (filter) {
      case 'active':
        filtered = filtered.filter(p => p.enabled)
        break
      case 'inactive':
        filtered = filtered.filter(p => !p.enabled)
        break
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }

    // Sort alphabetically by name
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [playbooks, searchQuery, filter])

  async function handleCreate(data: CreatePlaybookData) {
    const result = await createPlaybook(data)
    if (result.ok) {
      toast.success(t('success.created'))
      setShowCreateDialog(false)
      await loadPlaybooks()
      navigate({ to: '/playbooks/$playbookId', params: { playbookId: result.data.id } })
    } else {
      toast.error(t('errors.createFailed'))
    }
  }

  function handleSelect(playbook: Playbook) {
    navigate({ to: '/playbooks/$playbookId', params: { playbookId: playbook.id } })
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
              name="playbook-search"
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
                <DropdownMenuRadioItem value="active">{t('list.filter.active')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="inactive">{t('list.filter.inactive')}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : filteredPlaybooks.length === 0 ? (
          <EmptyState
            variant="inline"
            icon={BookOpen}
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
            {filteredPlaybooks.map((playbook) => (
              <PlaybookListItem
                key={playbook.id}
                playbook={playbook}
                isSelected={playbook.id === playbookId}
                onClick={() => handleSelect(playbook)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create Dialog */}
      <CreatePlaybookDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
      />
    </div>
  )
}
