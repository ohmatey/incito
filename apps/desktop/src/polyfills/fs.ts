// Browser stub for Node.js fs module
// @anthropic-ai/claude-agent-sdk requires this but we use Tauri APIs instead

export function readFileSync(): never {
  throw new Error('fs.readFileSync is not available in browser - use Tauri APIs')
}

export function writeFileSync(): never {
  throw new Error('fs.writeFileSync is not available in browser - use Tauri APIs')
}

export function existsSync(): boolean {
  return false
}

export function mkdirSync(): void {
  // no-op
}

export function readdirSync(): string[] {
  return []
}

export function statSync(): { isDirectory: () => boolean; isFile: () => boolean } {
  return { isDirectory: () => false, isFile: () => false }
}

export function realpathSync(p: string): string {
  return p
}

export function unlinkSync(): void {
  // no-op
}

export function rmdirSync(): void {
  // no-op
}

export function accessSync(): void {
  throw new Error('File not found')
}

export function createReadStream(): never {
  throw new Error('fs.createReadStream not available in browser')
}

export function createWriteStream(): never {
  throw new Error('fs.createWriteStream not available in browser')
}

export function watch(): { close: () => void } {
  return { close: () => {} }
}

export function watchFile(): void {
  // no-op
}

export function unwatchFile(): void {
  // no-op
}

export const constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1,
}

export const promises = {
  readFile: async () => { throw new Error('fs.promises.readFile not available in browser') },
  writeFile: async () => { throw new Error('fs.promises.writeFile not available in browser') },
  mkdir: async () => {},
  readdir: async () => [],
  stat: async () => ({ isDirectory: () => false, isFile: () => false }),
  access: async () => { throw new Error('File not found') },
}

export default {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  realpathSync,
  unlinkSync,
  rmdirSync,
  accessSync,
  createReadStream,
  createWriteStream,
  watch,
  watchFile,
  unwatchFile,
  constants,
  promises,
}
