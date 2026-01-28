// Browser polyfill for Node.js path module
// Provides minimal stubs for @anthropic-ai/claude-agent-sdk compatibility

export function join(...paths: string[]): string {
  return paths.filter(Boolean).join('/').replace(/\/+/g, '/')
}

export function dirname(p: string): string {
  const parts = p.split('/')
  parts.pop()
  return parts.join('/') || '/'
}

export function basename(p: string, ext?: string): string {
  let base = p.split('/').pop() || ''
  if (ext && base.endsWith(ext)) {
    base = base.slice(0, -ext.length)
  }
  return base
}

export function extname(p: string): string {
  const base = basename(p)
  const idx = base.lastIndexOf('.')
  return idx > 0 ? base.slice(idx) : ''
}

export function resolve(...paths: string[]): string {
  return join(...paths)
}

export function normalize(p: string): string {
  return p.replace(/\/+/g, '/')
}

export const sep = '/'
export const delimiter = ':'

export default {
  join,
  dirname,
  basename,
  extname,
  resolve,
  normalize,
  sep,
  delimiter,
}
