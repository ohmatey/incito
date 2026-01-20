import { useState, useEffect, useCallback } from 'react'
import type { PromptFile } from '@/types/prompt'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasAIConfigured } from '@/lib/store'
import { Sparkles, Loader2, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type PromptEditorMode = 'edit' | 'new-variant'

interface PromptEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: PromptFile | null
  mode: PromptEditorMode
  onSave: (template: string) => void
  onSaveAsVariant: (template: string, variantLabel: string) => void
  onRefineWithAI?: (template: string, instruction: string) => Promise<string>
}

export function PromptEditorDialog({
  open,
  onOpenChange,
  prompt,
  mode,
  onSave,
  onSaveAsVariant,
  onRefineWithAI,
}: PromptEditorDialogProps) {
  const [template, setTemplate] = useState('')
  const [aiInstruction, setAiInstruction] = useState('')
  const [variantLabel, setVariantLabel] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [aiConfigured, setAiConfigured] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)

  // Load AI configuration status
  useEffect(() => {
    async function checkAI() {
      const result = await hasAIConfigured()
      if (result.ok) {
        setAiConfigured(result.data)
      }
    }
    checkAI()
  }, [open])

  // Reset state when dialog opens/prompt changes
  useEffect(() => {
    if (open && prompt) {
      setTemplate(prompt.template)
      setAiInstruction('')
      setVariantLabel('')
      setShowAiPanel(false)
    }
  }, [open, prompt, mode])

  const handleRefine = useCallback(async () => {
    if (!onRefineWithAI || !aiInstruction.trim()) return

    setIsRefining(true)
    try {
      const refined = await onRefineWithAI(template, aiInstruction)
      setTemplate(refined)
      setAiInstruction('')
    } catch (error) {
      console.error('Failed to refine:', error)
    } finally {
      setIsRefining(false)
    }
  }, [template, aiInstruction, onRefineWithAI])

  const handleSave = useCallback(() => {
    onSave(template)
    onOpenChange(false)
  }, [template, onSave, onOpenChange])

  const handleSaveAsVariant = useCallback(() => {
    if (!variantLabel.trim()) return
    onSaveAsVariant(template, variantLabel.trim())
    onOpenChange(false)
  }, [template, variantLabel, onSaveAsVariant, onOpenChange])

  if (!prompt) return null

  const title = mode === 'edit' ? 'Edit Prompt' : 'Create Variant'
  const hasAI = aiConfigured && onRefineWithAI

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {prompt && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Based on: {prompt.name}
            </p>
          )}
        </DialogHeader>

        {/* Variant Name Input - shown at top when creating a variant */}
        {mode === 'new-variant' && (
          <div className="flex items-center gap-3">
            <Label htmlFor="variant-label" className="shrink-0">
              Variant Name:
            </Label>
            <Input
              id="variant-label"
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value)}
              placeholder="e.g., Formal, Casual, Technical"
              className="flex-1 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              autoFocus
            />
          </div>
        )}

        <div className="flex-1 min-h-0 flex gap-4">
          {/* Template Editor - 2/3 width when AI panel is shown */}
          <div className={`flex flex-col ${showAiPanel ? 'w-2/3' : 'w-full'}`}>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="template">Template</Label>
              {hasAI && !showAiPanel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => setShowAiPanel(true)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Refine with AI
                </Button>
              )}
            </div>
            <Textarea
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="flex-1 min-h-[400px] font-mono text-sm resize-none border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              placeholder="Write your prompt template here..."
            />
          </div>

          {/* AI Refinement Panel - 1/3 width, toggleable */}
          {hasAI && showAiPanel && (
            <div className="w-1/3 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="ai-instruction">AI Refinement</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowAiPanel(false)}
                >
                  Hide
                </Button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Describe how to improve the template:
              </p>
              <Textarea
                id="ai-instruction"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                className="flex-1 min-h-[200px] text-sm resize-none border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                placeholder="Make it more formal and professional..."
                autoFocus
              />
              <p className="mt-2 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                AI can make mistakes. Please review generated content.
              </p>
              <Button
                onClick={handleRefine}
                disabled={isRefining || !aiInstruction.trim()}
                className="mt-3 gap-2"
              >
                {isRefining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Refine
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          {mode === 'new-variant' ? (
            // In new-variant mode, primary action is Save as Variant
            <Button onClick={handleSaveAsVariant} disabled={!variantLabel.trim()}>
              Create Variant
            </Button>
          ) : (
            // In edit mode, show Save and Save as Variant dropdown
            <>
              <Button onClick={handleSave}>
                Save
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1">
                    Save as Variant
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="dropdown-variant-label" className="text-sm">
                        Variant Name
                      </Label>
                      <Input
                        id="dropdown-variant-label"
                        value={variantLabel}
                        onChange={(e) => setVariantLabel(e.target.value)}
                        placeholder="e.g., Formal, Casual"
                        className="mt-1 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Enter' && variantLabel.trim()) {
                            handleSaveAsVariant()
                          }
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!variantLabel.trim()}
                      onClick={handleSaveAsVariant}
                    >
                      Create Variant
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
