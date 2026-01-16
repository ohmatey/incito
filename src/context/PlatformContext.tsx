import { createContext, useContext, ReactNode } from 'react'

interface PlatformContextValue {
  isMac: boolean
  modKey: string
  modKeySymbol: string
}

const PlatformContext = createContext<PlatformContextValue | null>(null)

export function PlatformProvider({ children }: { children: ReactNode }) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <PlatformContext.Provider
      value={{
        isMac,
        modKey: isMac ? 'Cmd' : 'Ctrl',
        modKeySymbol: isMac ? '⌘' : 'Ctrl',
      }}
    >
      {children}
    </PlatformContext.Provider>
  )
}

export function usePlatform() {
  const context = useContext(PlatformContext)
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider')
  }
  return context
}

interface KbdProps {
  shortcut: string
  className?: string
}

export function Kbd({ shortcut, className = '' }: KbdProps) {
  const { modKeySymbol } = usePlatform()

  // Parse shortcut like "ModK" into parts ["⌘", "K"]
  const parts: string[] = []
  let remaining = shortcut

  if (remaining.startsWith('Mod')) {
    parts.push(modKeySymbol)
    remaining = remaining.slice(3)
  }

  if (remaining) {
    parts.push(remaining.toUpperCase())
  }

  return (
    <kbd
      className={`pointer-events-none inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ${className}`}
    >
      {parts.map((part, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span className="mx-0.5" />}
          {part}
        </span>
      ))}
    </kbd>
  )
}
