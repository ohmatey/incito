// Browser stub for Node.js url module
// Most of this is available natively via URL API

export function fileURLToPath(url: string | URL): string {
  const urlStr = typeof url === 'string' ? url : url.href
  return urlStr.replace(/^file:\/\//, '')
}

export function pathToFileURL(path: string): URL {
  return new URL(`file://${path}`)
}

export const URL = globalThis.URL
export const URLSearchParams = globalThis.URLSearchParams

export default {
  fileURLToPath,
  pathToFileURL,
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
}
