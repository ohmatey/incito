import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AgentFile, AgentIcon as AgentIconType } from '@/types/agent'
import {
  Bot,
  Brain,
  Sparkles,
  Wand2,
  Search,
  Pencil,
  Code,
  FileText,
  MessageCircle,
  Zap,
  Lightbulb,
  Target,
  Clipboard,
  BookOpen,
  Globe,
} from 'lucide-react'

const ICON_MAP: Record<AgentIconType, React.ComponentType<{ className?: string }>> = {
  bot: Bot,
  brain: Brain,
  sparkles: Sparkles,
  wand: Wand2,
  search: Search,
  pencil: Pencil,
  code: Code,
  'file-text': FileText,
  'message-circle': MessageCircle,
  zap: Zap,
  lightbulb: Lightbulb,
  target: Target,
  clipboard: Clipboard,
  book: BookOpen,
  globe: Globe,
}

interface AgentSelectorDropdownProps {
  selectedId: string | null
  onSelectionChange: (id: string | null) => void
  agents: AgentFile[]
  disabled?: boolean
  placeholder?: string
}

export function AgentSelectorDropdown({
  selectedId,
  onSelectionChange,
  agents,
  disabled,
  placeholder,
}: AgentSelectorDropdownProps) {
  const { t } = useTranslation('runMode')

  // Find selected agent for display
  const selectedAgent = selectedId ? agents.find(a => a.id === selectedId) : null
  const SelectedIcon = selectedAgent ? (ICON_MAP[selectedAgent.icon] || Bot) : null

  return (
    <Select
      value={selectedId ?? '__none__'}
      onValueChange={(value) => onSelectionChange(value === '__none__' ? null : value)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={placeholder ?? t('agent.label')}>
          {selectedAgent && SelectedIcon ? (
            <div className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4 text-gray-500" />
              <span className="truncate">{selectedAgent.name}</span>
            </div>
          ) : (
            t('agent.none')
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-gray-500">{t('agent.none')}</span>
        </SelectItem>
        {agents.map((agent) => {
          const IconComponent = ICON_MAP[agent.icon] || Bot
          return (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center gap-2">
                <IconComponent className="h-4 w-4 text-gray-500" />
                <span>{agent.name}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
