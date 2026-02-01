import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DiffMatchPatch from 'diff-match-patch'
import type { PromptFile } from '@/types/prompt'
import { getPromptVersions, type PromptVersionRow } from '@/lib/store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Clock, RotateCcw, Eye, ChevronUp, GitCompare, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'

interface HistoryTabProps {
  prompt: PromptFile | null
  onRestore?: (content: string) => void
}

interface DiffSegment {
  type: 'equal' | 'insert' | 'delete'
  text: string
}

export function HistoryTab({ prompt, onRestore }: HistoryTabProps) {
  const { t } = useTranslation('common')
  const [versions, setVersions] = useState<PromptVersionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)
  const [restoreDialogVersion, setRestoreDialogVersion] = useState<PromptVersionRow | null>(null)
  const [hoveredTimestampId, setHoveredTimestampId] = useState<string | null>(null)
  const [diffMode, setDiffMode] = useState(false)
  const [selectedForDiff, setSelectedForDiff] = useState<[string | null, string | null]>([null, null])

  useEffect(() => {
    if (prompt) {
      loadVersions(prompt.path)
    } else {
      setVersions([])
    }
  }, [prompt?.path])

  async function loadVersions(promptPath: string) {
    setLoading(true)
    const result = await getPromptVersions(promptPath)
    if (result.ok) {
      setVersions(result.data)
    }
    setLoading(false)
  }

  function formatTimestamp(isoString: string): string {
    const date = new Date(isoString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    if (isToday) {
      return `Today at ${timeStr}`
    } else if (isYesterday) {
      return `Yesterday at ${timeStr}`
    } else {
      const dateStr = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
      return `${dateStr} at ${timeStr}`
    }
  }

  function formatFullDate(isoString: string): string {
    const date = new Date(isoString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  }

  function handleRestore(version: PromptVersionRow) {
    if (onRestore) {
      onRestore(version.content)
      setRestoreDialogVersion(null)
    }
  }

  function handleVersionClick(versionId: string) {
    if (!diffMode) return

    const [first, second] = selectedForDiff
    if (first === null) {
      setSelectedForDiff([versionId, null])
    } else if (first === versionId) {
      setSelectedForDiff([null, null])
    } else if (second === null) {
      setSelectedForDiff([first, versionId])
    } else {
      // Both selected, start fresh
      setSelectedForDiff([versionId, null])
    }
  }

  function exitDiffMode() {
    setDiffMode(false)
    setSelectedForDiff([null, null])
  }

  // Compute diff when two versions are selected
  const diffResult = useMemo((): DiffSegment[] | null => {
    const [firstId, secondId] = selectedForDiff
    if (!firstId || !secondId) return null

    const firstVersion = versions.find(v => v.id === firstId)
    const secondVersion = versions.find(v => v.id === secondId)
    if (!firstVersion || !secondVersion) return null

    // Ensure older version is first (text1), newer is second (text2)
    const [older, newer] = firstVersion.version_number < secondVersion.version_number
      ? [firstVersion, secondVersion]
      : [secondVersion, firstVersion]

    const dmp = new DiffMatchPatch()
    const diffs = dmp.diff_main(older.content, newer.content)
    dmp.diff_cleanupSemantic(diffs)

    return diffs.map(([op, text]) => ({
      type: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete',
      text,
    }))
  }, [selectedForDiff, versions])

  const selectedVersions = useMemo(() => {
    const [firstId, secondId] = selectedForDiff
    const first = firstId ? versions.find(v => v.id === firstId) : null
    const second = secondId ? versions.find(v => v.id === secondId) : null
    return { first, second }
  }, [selectedForDiff, versions])

  if (!prompt) {
    return (
      <EmptyState
        variant="inline"
        title={t('header.selectPrompt')}
        className="h-full"
      />
    )
  }

  if (loading) {
    return (
      <EmptyState
        variant="inline"
        title={t('rightPanel.loadingHistory')}
        className="h-full"
      />
    )
  }

  if (versions.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title={t('rightPanel.noHistory')}
        description={t('rightPanel.historyAutoSave')}
        className="h-full"
      />
    )
  }

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header with Compare button */}
        {versions.length >= 2 && (
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            {diffMode ? (
              <>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedForDiff[0] && selectedForDiff[1]
                    ? t('rightPanel.diffReady', 'Comparing versions')
                    : selectedForDiff[0]
                    ? t('rightPanel.selectSecondVersion', 'Select second version')
                    : t('rightPanel.selectFirstVersion', 'Select first version')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitDiffMode}
                  className="h-7 gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  {t('buttons.cancel')}
                </Button>
              </>
            ) : (
              <>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('rightPanel.versionCount', '{{count}} versions', { count: versions.length })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDiffMode(true)}
                  className="h-7 gap-1.5 text-xs"
                >
                  <GitCompare className="h-3 w-3" />
                  {t('rightPanel.compare', 'Compare')}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Diff View */}
        {diffMode && diffResult && (
          <div className="border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                v{selectedVersions.first?.version_number} → v{selectedVersions.second?.version_number}
              </span>
              <span>
                {diffResult.filter(d => d.type === 'insert').length > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    +{diffResult.filter(d => d.type === 'insert').reduce((sum, d) => sum + d.text.length, 0)}
                  </span>
                )}
                {' '}
                {diffResult.filter(d => d.type === 'delete').length > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    -{diffResult.filter(d => d.type === 'delete').reduce((sum, d) => sum + d.text.length, 0)}
                  </span>
                )}
              </span>
            </div>
            <ScrollArea className="max-h-[200px]">
              <pre className="whitespace-pre-wrap break-words rounded border border-gray-200 bg-white p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-800">
                {diffResult.map((segment, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      segment.type === 'insert' && 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
                      segment.type === 'delete' && 'bg-red-100 text-red-800 line-through dark:bg-red-900/40 dark:text-red-300'
                    )}
                  >
                    {segment.text}
                  </span>
                ))}
              </pre>
            </ScrollArea>
          </div>
        )}

        {/* Versions list */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {versions.map((version) => {
              const isExpanded = expandedVersionId === version.id
              const isActive = prompt?.rawContent === version.content
              const isSelectedForDiff = selectedForDiff.includes(version.id)
              const selectionOrder = selectedForDiff.indexOf(version.id)

              return (
                <div key={version.id} className="group">
                  <div
                    className={cn(
                      'flex items-center justify-between p-3 transition-colors',
                      isActive && 'bg-primary-50/50 dark:bg-primary-900/10',
                      diffMode && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      isSelectedForDiff && 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-300 dark:ring-blue-700'
                    )}
                    onClick={() => handleVersionClick(version.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {diffMode && isSelectedForDiff && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
                            {selectionOrder + 1}
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          v{version.version_number}
                        </span>
                        {isActive && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">
                            {t('rightPanel.active')}
                          </span>
                        )}
                      </div>
                      {version.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate" title={version.description}>
                          {version.description}
                        </p>
                      )}
                      <p
                        className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 cursor-default"
                        onMouseEnter={() => setHoveredTimestampId(version.id)}
                        onMouseLeave={() => setHoveredTimestampId(null)}
                      >
                        {hoveredTimestampId === version.id
                          ? formatFullDate(version.created_at)
                          : formatTimestamp(version.created_at)}
                      </p>
                    </div>
                    {!diffMode && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                          className="h-8 w-8"
                          title={isExpanded ? t('rightPanel.hidePreview') : t('rightPanel.showPreview')}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        {onRestore && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRestoreDialogVersion(version)}
                            className="h-8 w-8 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                            title={t('rightPanel.restoreVersion')}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded preview */}
                  {isExpanded && !diffMode && (
                    <div className="bg-gray-50 border-t border-gray-100 dark:bg-gray-900/50 dark:border-gray-800">
                      <div className="p-3">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                          {formatFullDate(version.created_at)}
                        </p>
                        <pre className="whitespace-pre-wrap text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-[200px] overflow-auto">
                          {version.content}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Restore confirmation dialog */}
      <Dialog open={!!restoreDialogVersion} onOpenChange={(open) => !open && setRestoreDialogVersion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rightPanel.restoreVersionTitle')}</DialogTitle>
            <DialogDescription>
              {t('rightPanel.restoreVersionDescription', { version: restoreDialogVersion?.version_number })}
            </DialogDescription>
          </DialogHeader>
          {restoreDialogVersion && (
            <div className="my-4 max-h-[200px] overflow-auto">
              <pre className="whitespace-pre-wrap text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                {restoreDialogVersion.content.slice(0, 500)}
                {restoreDialogVersion.content.length > 500 && '...'}
              </pre>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogVersion(null)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={() => restoreDialogVersion && handleRestore(restoreDialogVersion)}>
              {t('rightPanel.restoreVersionButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
