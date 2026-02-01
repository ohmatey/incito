import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getPlaybookRules, createPlaybookRule, updatePlaybookRule, deletePlaybookRule } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { RuleRow } from './RuleRow'
import { CreateRuleDialog } from './CreateRuleDialog'
import { Plus, Loader2, BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import type { PlaybookRule, CreatePlaybookRuleData } from '@/types/playbook'

interface RuleTableProps {
  playbookId: string
  onRulesChange?: () => void
}

export function RuleTable({ playbookId, onRulesChange }: RuleTableProps) {
  const { t } = useTranslation('playbooks')
  const [rules, setRules] = useState<PlaybookRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadRules()
  }, [playbookId])

  async function loadRules() {
    setIsLoading(true)
    const result = await getPlaybookRules(playbookId)
    if (result.ok) {
      setRules(result.data)
    } else {
      toast.error(t('errors.loadFailed'))
    }
    setIsLoading(false)
  }

  async function handleCreate(data: CreatePlaybookRuleData) {
    const result = await createPlaybookRule(data)
    if (result.ok) {
      toast.success(t('success.ruleCreated'))
      setShowCreateDialog(false)
      await loadRules()
      onRulesChange?.()
    } else {
      toast.error(t('errors.createRuleFailed'))
    }
  }

  async function handleToggle(ruleId: string, enabled: boolean) {
    const result = await updatePlaybookRule(ruleId, { enabled })
    if (result.ok) {
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled } : r))
    } else {
      toast.error(t('errors.updateRuleFailed'))
    }
  }

  async function handleDelete(ruleId: string) {
    const result = await deletePlaybookRule(ruleId)
    if (result.ok) {
      toast.success(t('success.ruleDeleted'))
      await loadRules()
      onRulesChange?.()
    } else {
      toast.error(t('errors.deleteRuleFailed'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {t('rules.title')} ({rules.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('rules.addRule')}
        </Button>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <EmptyState
          variant="inline"
          icon={BookOpen}
          title={t('detail.noRules')}
          description={t('detail.addFirstRule')}
          action={{
            label: t('rules.addRule'),
            onClick: () => setShowCreateDialog(true),
            icon: Plus,
            variant: 'outline',
          }}
        />
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateRuleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        playbookId={playbookId}
        onCreate={handleCreate}
      />
    </div>
  )
}
