// Browser polyfill for Node.js events module
// Provides minimal stubs for @anthropic-ai/claude-agent-sdk compatibility

export class EventEmitter {
  private listeners: Map<string, Array<(...args: unknown[]) => void>> = new Map()

  on(event: string, listener: (...args: unknown[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
    return this
  }

  off(event: string, listener: (...args: unknown[]) => void): this {
    const arr = this.listeners.get(event)
    if (arr) {
      const idx = arr.indexOf(listener)
      if (idx !== -1) arr.splice(idx, 1)
    }
    return this
  }

  emit(event: string, ...args: unknown[]): boolean {
    const arr = this.listeners.get(event)
    if (arr) {
      arr.forEach(fn => fn(...args))
      return true
    }
    return false
  }

  once(event: string, listener: (...args: unknown[]) => void): this {
    const wrapped = (...args: unknown[]) => {
      this.off(event, wrapped)
      listener(...args)
    }
    return this.on(event, wrapped)
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
    return this
  }

  addListener = this.on
  removeListener = this.off
}

// Stub for setMaxListeners - not needed in browser
export function setMaxListeners(): void {
  // No-op in browser
}

export default EventEmitter
