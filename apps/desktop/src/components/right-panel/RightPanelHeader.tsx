import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import type { RightPanelTab } from '@/components/PromptHeader'
import { Button } from '@/components/ui/button'
import { X, Plus, ExternalLink } from 'lucide-react'
import { TabsDropdown } from '@/components/TabsDropdown'

interface RightPanelHeaderProps {
  activeTab: RightPanelTab
  isEditMode?: boolean
  promptId?: string
  onTabChange: (tab: RightPanelTab) => void
  onClose: () => void
  onAddNote?: () => void
  runsEnabled?: boolean
}

export function RightPanelHeader({
  activeTab,
  isEditMode = false,
  promptId,
  onTabChange,
  onClose,
  onAddNote,
  runsEnabled = false,
}: RightPanelHeaderProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  const handleOpenPrompt = () => {
    if (promptId) {
      navigate({ to: '/prompts/$promptId', params: { promptId } })
    }
  }

  return (
    <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
      {/* Left - Tab dropdown */}
      <TabsDropdown
        activeTab={activeTab}
        isEditMode={isEditMode}
        runsEnabled={runsEnabled}
        onTabChange={onTabChange}
      />

      {/* Right - Actions */}
      <div className="flex items-center gap-1">
        {/* Open prompt button for runs tab */}
        {activeTab === 'runs' && promptId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenPrompt}
            className="h-8 w-8"
            aria-label={t('rightPanel.openPrompt')}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}

        {/* Add button for notes tab */}
        {activeTab === 'notes' && onAddNote && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddNote}
            className="h-8 w-8"
            aria-label={t('rightPanel.addNote')}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
          aria-label={t('rightPanel.closePanel')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
