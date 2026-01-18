import { useState, useEffect } from 'react'
import type { PromptFile } from '@/types/prompt'
import { getPromptVersions, type PromptVersionRow } from '@/lib/store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Clock, RotateCcw, Eye, ChevronUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface HistoryTabProps {
  prompt: PromptFile | null
  onRestore?: (content: string) => void
}

export function HistoryTab({ prompt, onRestore }: HistoryTabProps) {
  const [versions, setVersions] = useState<PromptVersionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)
  const [restoreDialogVersion, setRestoreDialogVersion] = useState<PromptVersionRow | null>(null)

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

  function formatDate(isoString: string): string {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) {
      return 'Just now'
    } else if (diffMins < 60) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  }

  function formatFullDate(isoString: string): string {
    const date = new Date(isoString)
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function handleRestore(version: PromptVersionRow) {
    if (onRestore) {
      onRestore(version.content)
      setRestoreDialogVersion(null)
    }
  }

  if (!prompt) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a prompt</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading history...</p>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
          <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="mt-4 font-medium text-gray-700 dark:text-gray-300">
          No version history yet
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Versions are created automatically when you save changes
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Versions list */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {versions.map((version, index) => {
              const isExpanded = expandedVersionId === version.id
              const isFirst = index === 0

              return (
                <div key={version.id} className="group">
                  <div
                    className={`flex items-center justify-between p-3 ${
                      isFirst ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          v{version.version_number}
                        </span>
                        {isFirst && (
                          <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded dark:bg-primary-900/30 dark:text-primary-400">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatDate(version.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                        className="h-7 w-7"
                        title={isExpanded ? 'Hide preview' : 'Show preview'}
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
                          className="h-7 w-7 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                          title="Restore this version"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded preview */}
                  {isExpanded && (
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
            <DialogTitle>Restore Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore version {restoreDialogVersion?.version_number}? This will replace the current content with the selected version. A new version will be created with your current content before restoring.
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
              Cancel
            </Button>
            <Button onClick={() => restoreDialogVersion && handleRestore(restoreDialogVersion)}>
              Restore Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
