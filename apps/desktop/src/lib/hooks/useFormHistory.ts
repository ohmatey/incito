import { useState, useCallback, useRef, useEffect } from 'react'

export type ChangeSource = 'user' | 'ai_fill' | 'ai_refine' | 'reset'

export interface ValueChange {
  key: string
  value: unknown
  previousValue: unknown
}

export interface HistoryEntry {
  id: string
  changes: ValueChange[]
  source: ChangeSource
  timestamp: number
}

export interface UseFormHistoryOptions {
  /** Max number of history entries to keep (default: 50) */
  maxHistorySize?: number
  /** Debounce time for user input in ms (default: 500) */
  debounceMs?: number
  /** Callback when values change */
  onValuesChange?: (values: Record<string, unknown>) => void
}

export interface UseFormHistoryResult {
  /** Current form values */
  values: Record<string, unknown>

  /** Set a single value (user input - debounced) */
  setValue: (key: string, value: unknown) => void

  /** Set multiple values at once (AI operations - immediate) */
  setValues: (changes: Record<string, unknown>, source: ChangeSource) => void

  /** Replace all values (e.g., when loading a prompt) */
  replaceValues: (newValues: Record<string, unknown>) => void

  /** Undo last change */
  undo: () => void

  /** Redo last undone change */
  redo: () => void

  /** Whether undo is available */
  canUndo: boolean

  /** Whether redo is available */
  canRedo: boolean

  /** Full history for debugging/display */
  history: {
    past: HistoryEntry[]
    future: HistoryEntry[]
  }

  /** Clear all history */
  clearHistory: () => void

  /** Get the source of the last change for a specific key */
  getLastChangeSource: (key: string) => ChangeSource | null
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useFormHistory(
  initialValues: Record<string, unknown> = {},
  options: UseFormHistoryOptions = {}
): UseFormHistoryResult {
  const {
    maxHistorySize = 50,
    debounceMs = 500,
    onValuesChange,
  } = options

  // Current values
  const [values, setValuesState] = useState<Record<string, unknown>>(initialValues)

  // History stacks
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])

  // Track pending user changes for debouncing
  const pendingChangesRef = useRef<Map<string, { value: unknown; previousValue: unknown }>>(new Map())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track current values in ref for use in callbacks
  const valuesRef = useRef(values)
  valuesRef.current = values

  // Flush pending user changes to history
  const flushPendingChanges = useCallback(() => {
    const pending = pendingChangesRef.current
    if (pending.size === 0) return

    const changes: ValueChange[] = []
    pending.forEach((change, key) => {
      changes.push({
        key,
        value: change.value,
        previousValue: change.previousValue,
      })
    })

    const entry: HistoryEntry = {
      id: generateId(),
      changes,
      source: 'user',
      timestamp: Date.now(),
    }

    setPast((prev) => {
      const newPast = [...prev, entry]
      // Trim to max size
      if (newPast.length > maxHistorySize) {
        return newPast.slice(-maxHistorySize)
      }
      return newPast
    })

    // Clear future on new changes
    setFuture([])

    // Clear pending
    pendingChangesRef.current = new Map()
  }, [maxHistorySize])

  // Set a single value (user input - debounced)
  const setValue = useCallback((key: string, value: unknown) => {
    const currentValue = valuesRef.current[key]

    // Skip if value hasn't changed
    if (currentValue === value) return

    // Track this change
    const existing = pendingChangesRef.current.get(key)
    pendingChangesRef.current.set(key, {
      value,
      // Keep the original previous value if we're updating an existing pending change
      previousValue: existing?.previousValue ?? currentValue,
    })

    // Update current values immediately
    const newValues = { ...valuesRef.current, [key]: value }
    setValuesState(newValues)
    onValuesChange?.(newValues)

    // Debounce history commit
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(flushPendingChanges, debounceMs)
  }, [debounceMs, flushPendingChanges, onValuesChange])

  // Set multiple values at once (AI operations - immediate, no debounce)
  const setValues = useCallback((changes: Record<string, unknown>, source: ChangeSource) => {
    // Flush any pending user changes first
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    flushPendingChanges()

    const currentValues = valuesRef.current
    const valueChanges: ValueChange[] = []

    // Build changes array, filtering out no-ops
    for (const [key, value] of Object.entries(changes)) {
      if (currentValues[key] !== value) {
        valueChanges.push({
          key,
          value,
          previousValue: currentValues[key],
        })
      }
    }

    // Skip if no actual changes
    if (valueChanges.length === 0) return

    // Create history entry
    const entry: HistoryEntry = {
      id: generateId(),
      changes: valueChanges,
      source,
      timestamp: Date.now(),
    }

    setPast((prev) => {
      const newPast = [...prev, entry]
      if (newPast.length > maxHistorySize) {
        return newPast.slice(-maxHistorySize)
      }
      return newPast
    })

    // Clear future on new changes
    setFuture([])

    // Apply changes
    const newValues = { ...currentValues }
    for (const change of valueChanges) {
      newValues[change.key] = change.value
    }
    setValuesState(newValues)
    onValuesChange?.(newValues)
  }, [flushPendingChanges, maxHistorySize, onValuesChange])

  // Replace all values without creating history (e.g., loading a different prompt)
  const replaceValues = useCallback((newValues: Record<string, unknown>) => {
    // Cancel any pending changes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingChangesRef.current = new Map()

    // Clear history
    setPast([])
    setFuture([])

    // Set new values
    setValuesState(newValues)
    onValuesChange?.(newValues)
  }, [onValuesChange])

  // Undo last change
  const undo = useCallback(() => {
    // Flush pending changes first
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    flushPendingChanges()

    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast

      const lastEntry = prevPast[prevPast.length - 1]
      const newPast = prevPast.slice(0, -1)

      // Apply reverse changes
      const currentValues = valuesRef.current
      const newValues = { ...currentValues }
      for (const change of lastEntry.changes) {
        newValues[change.key] = change.previousValue
      }

      setValuesState(newValues)
      onValuesChange?.(newValues)

      // Move to future
      setFuture((prevFuture) => [...prevFuture, lastEntry])

      return newPast
    })
  }, [flushPendingChanges, onValuesChange])

  // Redo last undone change
  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture

      const lastEntry = prevFuture[prevFuture.length - 1]
      const newFuture = prevFuture.slice(0, -1)

      // Apply changes
      const currentValues = valuesRef.current
      const newValues = { ...currentValues }
      for (const change of lastEntry.changes) {
        newValues[change.key] = change.value
      }

      setValuesState(newValues)
      onValuesChange?.(newValues)

      // Move to past
      setPast((prevPast) => [...prevPast, lastEntry])

      return newFuture
    })
  }, [onValuesChange])

  // Clear all history
  const clearHistory = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingChangesRef.current = new Map()
    setPast([])
    setFuture([])
  }, [])

  // Get the source of the last change for a specific key
  const getLastChangeSource = useCallback((key: string): ChangeSource | null => {
    // Check from most recent to oldest
    for (let i = past.length - 1; i >= 0; i--) {
      const entry = past[i]
      if (entry.changes.some((c) => c.key === key)) {
        return entry.source
      }
    }
    return null
  }, [past])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    values,
    setValue,
    setValues,
    replaceValues,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    history: { past, future },
    clearHistory,
    getLastChangeSource,
  }
}
