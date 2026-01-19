import type { RightPanelTab } from '@/components/PromptHeader'
import { Button } from '@/components/ui/button'
import { ChevronDown, X, Eye, History, Settings2, StickyNote, Plus, List } from 'lucide-react'
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
}

export function RightPanelHeader({
  activeTab,
  onTabChange,
  onClose,
  onAddNote,
}: RightPanelHeaderProps) {
  const tabLabels: Record<RightPanelTab, string> = {
    preview: 'Prompt',
    history: 'History',
    notes: 'Notes',
    config: 'Config',
    instructions: 'Instructions',
  }

  const tabIcons: Record<RightPanelTab, React.ReactNode> = {
    preview: <Eye className="h-4 w-4" />,
    history: <History className="h-4 w-4" />,
    notes: <StickyNote className="h-4 w-4" />,
    config: <Settings2 className="h-4 w-4" />,
    instructions: <List className="h-4 w-4" />,
  }

  // Instructions tab is always available
  const availableTabs: RightPanelTab[] = ['preview', 'instructions', 'notes', 'history', 'config']

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
            aria-label="Add note"
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
          aria-label="Close panel"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
