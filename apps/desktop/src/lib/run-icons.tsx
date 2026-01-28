import {
  Check,
  X,
  Clock,
  Loader2,
  Copy,
  Play,
  Bot,
  ExternalLink,
} from 'lucide-react'

type IconSize = 'sm' | 'md'

const sizeClasses: Record<IconSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
}

export function getLauncherIcon(id: string, size: IconSize = 'md') {
  const className = sizeClasses[size]

  const icons: Record<string, React.ReactNode> = {
    copy: <Copy className={className} />,
    run_mode: <Play className={className} />,
    agent: <Bot className={className} />,
    api: <ExternalLink className={className} />,
    claude: <ExternalLink className={className} />,
    chatgpt: <ExternalLink className={className} />,
    perplexity: <ExternalLink className={className} />,
    gemini: <ExternalLink className={className} />,
  }

  return icons[id] || <ExternalLink className={className} />
}

export function getStatusIcon(status: string, size: IconSize = 'md') {
  const className = sizeClasses[size]

  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className={`${className} text-gray-400`} />,
    in_progress: <Loader2 className={`${className} animate-spin text-blue-500`} />,
    completed: <Check className={`${className} text-green-500`} />,
    error: <X className={`${className} text-red-500`} />,
    cancelled: <X className={`${className} text-gray-400`} />,
  }

  return icons[status] || <Clock className={`${className} text-gray-400`} />
}
