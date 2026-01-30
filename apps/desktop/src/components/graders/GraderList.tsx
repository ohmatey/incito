import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getAllGraders, createGrader, seedBuiltinGraders } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GraderListItem } from './GraderListItem'
import { CreateGraderDialog } from './CreateGraderDialog'
import { Plus, Search, Loader2, Code, Brain } from 'lucide-react'
import type { Grader, AssertionGrader, LLMJudgeGrader } from '@/types/grader'
import { isAssertionGrader } from '@/types/grader'

export function GraderList() {
  const { t } = useTranslation('graders')
  const navigate = useNavigate()
  const { graderId } = useParams({ strict: false })

  const [graders, setGraders] = useState<Grader[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
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

  const filteredGraders = useMemo(() => {
    if (!searchQuery.trim()) return graders
    const query = searchQuery.toLowerCase()
    return graders.filter(g =>
      g.name.toLowerCase().includes(query) ||
      g.description?.toLowerCase().includes(query)
    )
  }, [graders, searchQuery])

  const assertionGraders = useMemo(() =>
    filteredGraders.filter(g => isAssertionGrader(g)),
    [filteredGraders]
  )

  const llmJudgeGraders = useMemo(() =>
    filteredGraders.filter(g => !isAssertionGrader(g)),
    [filteredGraders]
  )

  async function handleCreate(grader: Omit<AssertionGrader, 'id' | 'createdAt' | 'updatedAt'> | Omit<LLMJudgeGrader, 'id' | 'createdAt' | 'updatedAt'>) {
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
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('list.searchPlaceholder')}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : filteredGraders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? t('list.empty') : t('list.createFirst')}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('create.button')}
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {/* Assertions Section */}
            {assertionGraders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 py-1">
                  <Code className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('list.assertions')}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({assertionGraders.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {assertionGraders.map((grader) => (
                    <GraderListItem
                      key={grader.id}
                      grader={grader}
                      isSelected={grader.id === graderId}
                      onClick={() => handleSelect(grader)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* LLM Judges Section */}
            {llmJudgeGraders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 py-1">
                  <Brain className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('list.llmJudges')}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({llmJudgeGraders.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {llmJudgeGraders.map((grader) => (
                    <GraderListItem
                      key={grader.id}
                      grader={grader}
                      isSelected={grader.id === graderId}
                      onClick={() => handleSelect(grader)}
                    />
                  ))}
                </div>
              </div>
            )}
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
