// Browser stub for Node.js fs/promises module

export async function readFile(): Promise<never> {
  throw new Error('fs.promises.readFile not available in browser - use Tauri APIs')
}

export async function writeFile(): Promise<never> {
  throw new Error('fs.promises.writeFile not available in browser - use Tauri APIs')
}

export async function mkdir(): Promise<void> {
  // no-op
}

export async function readdir(): Promise<string[]> {
  return []
}

export async function stat(): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
  return { isDirectory: () => false, isFile: () => false }
}

export async function access(): Promise<never> {
  throw new Error('File not found')
}

export async function unlink(): Promise<void> {
  // no-op
}

export async function rm(): Promise<void> {
  // no-op
}

export default {
  readFile,
  writeFile,
  mkdir,
  readdir,
  stat,
  access,
  unlink,
  rm,
}
