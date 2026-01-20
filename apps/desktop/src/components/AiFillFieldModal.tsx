import { useState, useCallback } from 'react'
import type { Variable } from '@/types/prompt'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AiFillFieldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variable: Variable | null
  otherVariables: Variable[]
  currentValues: Record<string, unknown>
  onGenerate: (value: string) => void
}

export function AiFillFieldModal({
  open,
  onOpenChange,
  variable,
  otherVariables,
  currentValues,
  onGenerate,
}: AiFillFieldModalProps) {
  const [userPrompt, setUserPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!variable || !userPrompt.trim()) return

    setIsGenerating(true)
    try {
      const { fillSingleFieldWithAI } = await import('@/lib/mastra-client')
      const result = await fillSingleFieldWithAI(
        variable,
        otherVariables,
        currentValues,
        userPrompt
      )

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      onGenerate(result.data.value)
      setUserPrompt('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to generate:', error)
      toast.error('Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }, [variable, otherVariables, currentValues, userPrompt, onGenerate, onOpenChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && userPrompt.trim() && !isGenerating) {
        e.preventDefault()
        handleGenerate()
      }
    },
    [handleGenerate, userPrompt, isGenerating]
  )

  // Reset state when modal closes
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setUserPrompt('')
        setIsGenerating(false)
      }
      onOpenChange(open)
    },
    [onOpenChange]
  )

  if (!variable) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary-500" />
            Generate {variable.label}
          </DialogTitle>
          {variable.description && (
            <DialogDescription>{variable.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to generate..."
              className="min-h-[100px] resize-none"
              autoFocus
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              The AI will use other form values as context to generate relevant content.
            </p>
            <p className="mt-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
              AI can make mistakes. Please review generated content.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !userPrompt.trim()}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
