import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ChevronDown, ChevronRight, Trash2, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlaybookRule } from '@/types/playbook'

interface RuleRowProps {
  rule: PlaybookRule
  onToggle: (ruleId: string, enabled: boolean) => void
  onDelete: (ruleId: string) => void
}

export const RuleRow = memo(function RuleRow({ rule, onToggle, onDelete }: RuleRowProps) {
  const { t } = useTranslation('playbooks')
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const hasExamples = rule.badExampleInput || rule.badExampleOutput || rule.goldenOutput

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn(
          'rounded-lg border border-gray-200 dark:border-gray-700',
          !rule.enabled && 'opacity-60'
        )}>
          {/* Header Row */}
          <div className="flex items-start gap-3 p-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-0.5">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {rule.triggerContext}
                </span>
                {rule.sourceRunId && (
                  <Badge variant="outline" className="h-5 text-[10px] gap-1">
                    <Link2 className="h-3 w-3" />
                    {t('rules.sourceRun')}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {rule.instruction}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={rule.enabled}
                onCheckedChange={(checked) => onToggle(rule.id, checked)}
                aria-label={rule.enabled ? t('detail.enabled') : t('detail.disabled')}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-red-600"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expanded Content */}
          <CollapsibleContent>
            {hasExamples && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
                {rule.badExampleInput && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('rules.badExampleInput')}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 rounded p-2 whitespace-pre-wrap">
                      {rule.badExampleInput}
                    </div>
                  </div>
                )}

                {rule.badExampleOutput && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('rules.badExampleOutput')}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 rounded p-2 whitespace-pre-wrap">
                      {rule.badExampleOutput}
                    </div>
                  </div>
                )}

                {rule.goldenOutput && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('rules.goldenOutput')}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 rounded p-2 whitespace-pre-wrap">
                      {rule.goldenOutput}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  {t('rules.priority')}: {rule.priority}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rules.deleteRuleConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rules.deleteRuleWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(rule.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common:buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})
