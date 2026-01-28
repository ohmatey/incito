// Browser stub for Node.js process module

export function cwd(): string {
  return '/'
}

export const env: Record<string, string | undefined> = {}

export const platform = 'browser'

export const version = 'v18.0.0'

export const versions = {
  node: '18.0.0',
}

export const arch = 'x64'

export const pid = 1

export function exit(): never {
  throw new Error('process.exit not available in browser')
}

export const stdout = {
  write: console.log,
  on: () => {},
}

export const stderr = {
  write: console.error,
  on: () => {},
}

export const stdin = {
  on: () => {},
  resume: () => {},
  pause: () => {},
}

export function nextTick(fn: () => void): void {
  queueMicrotask(fn)
}

export const hrtime = {
  bigint: () => BigInt(performance.now() * 1e6),
}

export default {
  cwd,
  env,
  platform,
  version,
  versions,
  arch,
  pid,
  exit,
  stdout,
  stderr,
  stdin,
  nextTick,
  hrtime,
}
