#!/usr/bin/env node
// Build MCP sidecar binary for Tauri
// Cross-platform script that detects current platform and outputs binary with correct target triple suffix

import { execSync } from 'child_process'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mastraDir = dirname(__dirname)
const binariesDir = join(mastraDir, '..', 'src-tauri', 'binaries')

// Detect OS and architecture
const platform = process.platform
const arch = process.arch

// Map to Rust target triple format (used by Tauri)
let target
let ext = ''

if (platform === 'darwin') {
  if (arch === 'arm64') {
    target = 'aarch64-apple-darwin'
  } else if (arch === 'x64') {
    target = 'x86_64-apple-darwin'
  } else {
    console.error(`Unsupported macOS architecture: ${arch}`)
    process.exit(1)
  }
} else if (platform === 'linux') {
  if (arch === 'x64') {
    target = 'x86_64-unknown-linux-gnu'
  } else if (arch === 'arm64') {
    target = 'aarch64-unknown-linux-gnu'
  } else {
    console.error(`Unsupported Linux architecture: ${arch}`)
    process.exit(1)
  }
} else if (platform === 'win32') {
  target = 'x86_64-pc-windows-msvc'
  ext = '.exe'
} else {
  console.error(`Unsupported OS: ${platform}`)
  process.exit(1)
}

const outputFile = join(binariesDir, `incito-mcp-${target}${ext}`)

console.log(`Building MCP sidecar for ${target}...`)
console.log(`Output: ${outputFile}`)

// Ensure binaries directory exists
mkdirSync(binariesDir, { recursive: true })

// Build with Bun
const entryPoint = join(mastraDir, 'src', 'mcp', 'stdio.ts')
execSync(`bun build "${entryPoint}" --compile --outfile "${outputFile}"`, {
  cwd: mastraDir,
  stdio: 'inherit'
})

console.log(`Done! Built: ${outputFile}`)
