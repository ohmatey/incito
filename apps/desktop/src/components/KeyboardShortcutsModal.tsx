import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Shortcut {
  label: string
  keys: string[]
}

interface ShortcutSection {
  title: string
  shortcuts: Shortcut[]
}

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
const modKey = isMac ? '⌘' : 'Ctrl'

const shortcutSections: ShortcutSection[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { label: 'Search prompts', keys: [modKey, 'K'] },
      { label: 'New prompt', keys: [modKey, 'N'] },
      { label: 'Navigate prompt list', keys: ['↑', '↓'] },
      { label: 'Jump between variables', keys: [modKey, 'Shift', '↑/↓'] },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { label: 'Copy prompt', keys: [modKey, 'Enter'] },
      { label: 'Edit prompt', keys: [modKey, 'E'] },
      { label: 'Save changes', keys: [modKey, 'S'] },
      { label: 'Duplicate prompt', keys: [modKey, 'D'] },
    ],
  },
  {
    title: 'Prompt Panels',
    shortcuts: [
      { label: 'Toggle right panel', keys: [modKey, '\\'] },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { label: 'Show keyboard shortcuts', keys: [modKey, '/'] },
      { label: 'Close dialog / Cancel', keys: ['Esc'] },
      { label: 'Move between fields', keys: ['Tab'] },
    ],
  },
]

function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded bg-gray-100 px-1.5 font-mono text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      {children}
    </kbd>
  )
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600 dark:text-gray-400">{shortcut.label}</span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <ShortcutKey key={index}>{key}</ShortcutKey>
        ))}
      </div>
    </div>
  )
}

function ShortcutSectionComponent({ section }: { section: ShortcutSection }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {section.title}
      </h3>
      <div className="space-y-0.5">
        {section.shortcuts.map((shortcut, index) => (
          <ShortcutRow key={index} shortcut={shortcut} />
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Keyboard Shortcuts
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              {isMac ? 'Mac' : 'Windows/Linux'}
            </span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-2 gap-6 pr-4">
            {shortcutSections.map((section, index) => (
              <ShortcutSectionComponent key={index} section={section} />
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Press <ShortcutKey>{modKey}</ShortcutKey> <ShortcutKey>/</ShortcutKey> to toggle this panel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
