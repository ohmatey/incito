import { useTranslation } from 'react-i18next'
import type { RightPanelTab } from '@/components/PromptHeader'
import { Button } from '@/components/ui/button'
import { ChevronDown, X, Eye, History, Settings2, StickyNote, Plus, List, Clock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RightPanelHeaderProps {
  activeTab: RightPanelTab
  onTabChange: (tab: RightPanelTab) => void
  onClose: () => void
  onAddNote?: () => void
  runsEnabled?: boolean
}

export function RightPanelHeader({
  activeTab,
  onTabChange,
  onClose,
  onAddNote,
  runsEnabled = false,
}: RightPanelHeaderProps) {
  const { t } = useTranslation('common')

  const tabLabels: Record<RightPanelTab, string> = {
    preview: t('tabs.prompt'),
    history: t('tabs.history'),
    notes: t('tabs.notes'),
    config: t('tabs.config'),
    instructions: t('tabs.instructions'),
    runs: t('tabs.runs'),
  }

  const tabIcons: Record<RightPanelTab, React.ReactNode> = {
    preview: <Eye className="h-4 w-4" />,
    history: <History className="h-4 w-4" />,
    notes: <StickyNote className="h-4 w-4" />,
    config: <Settings2 className="h-4 w-4" />,
    instructions: <List className="h-4 w-4" />,
    runs: <Clock className="h-4 w-4" />,
  }

  // All tabs available in dropdown (runs conditional on feature flag)
  const availableTabs: RightPanelTab[] = runsEnabled
    ? ['preview', 'runs', 'instructions', 'notes', 'history', 'config']
    : ['preview', 'instructions', 'notes', 'history', 'config']

  return (
    <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
      {/* Left - Tab dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 px-2">
            {tabIcons[activeTab]}
            <span className="font-medium">{tabLabels[activeTab]}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {availableTabs.map((tab) => (
            <DropdownMenuItem
              key={tab}
              onClick={() => onTabChange(tab)}
              className="gap-2"
            >
              {tabIcons[tab]}
              {tabLabels[tab]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Right - Actions */}
      <div className="flex items-center gap-1">
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
