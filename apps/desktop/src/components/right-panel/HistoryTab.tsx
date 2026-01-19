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
  const [hoveredTimestampId, setHoveredTimestampId] = useState<string | null>(null)

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
            {versions.map((version) => {
              const isExpanded = expandedVersionId === version.id
              const isActive = prompt?.rawContent === version.content

              return (
                <div key={version.id} className="group">
                  <div
                    className={`flex items-center justify-between p-3 ${
                      isActive ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          v{version.version_number}
                        </span>
                        {isActive && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </span>
                        )}
                      </div>
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                        className="h-8 w-8"
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
                          className="h-8 w-8 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
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
