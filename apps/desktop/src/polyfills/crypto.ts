// Browser stub for Node.js crypto module
// Uses Web Crypto API where possible

export function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

export function randomUUID(): string {
  return globalThis.crypto.randomUUID()
}

export function createHash(algorithm: string): {
  update: (data: string) => { digest: (encoding: string) => string }
} {
  // Simplified stub - real hashing would need async Web Crypto
  return {
    update: () => ({
      digest: () => `stub-${algorithm}-hash`,
    }),
  }
}

export function createHmac(algorithm: string, _key: string): {
  update: (data: string) => { digest: (encoding: string) => string }
} {
  return {
    update: () => ({
      digest: () => `stub-${algorithm}-hmac`,
    }),
  }
}

export default {
  randomBytes,
  randomUUID,
  createHash,
  createHmac,
}
