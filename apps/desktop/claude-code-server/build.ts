import { $ } from 'bun'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

interface Target {
  bunTarget: string
  tauriSuffix: string
  ext?: string
}

const targets: Target[] = [
  { bunTarget: 'bun-darwin-arm64', tauriSuffix: 'aarch64-apple-darwin' },
  { bunTarget: 'bun-darwin-x64', tauriSuffix: 'x86_64-apple-darwin' },
  { bunTarget: 'bun-linux-x64', tauriSuffix: 'x86_64-unknown-linux-gnu' },
  { bunTarget: 'bun-windows-x64', tauriSuffix: 'x86_64-pc-windows-msvc', ext: '.exe' },
]

const binariesDir = join(import.meta.dir, '..', 'src-tauri', 'binaries')

async function build() {
  console.log('Building Claude Code server binaries...\n')

  // Create output directory
  await mkdir(binariesDir, { recursive: true })

  const results: { target: string; success: boolean; error?: string }[] = []

  for (const { bunTarget, tauriSuffix, ext = '' } of targets) {
    const outputName = `claude-code-server-${tauriSuffix}${ext}`
    const binPath = join(binariesDir, outputName)

    console.log(`Building for ${bunTarget}...`)

    try {
      await $`bun build src/index.ts --compile --target=${bunTarget} --outfile=${binPath}`.quiet()
      console.log(`  ✓ ${outputName}`)
      results.push({ target: bunTarget, success: true })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`  ✗ Failed: ${msg}`)
      results.push({ target: bunTarget, success: false, error: msg })
    }
  }

  console.log('\n--- Build Summary ---')
  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  console.log(`Succeeded: ${succeeded}/${targets.length}`)
  if (failed > 0) {
    console.log(`Failed: ${failed}`)
  }
  console.log(`\nBinaries location: ${binariesDir}`)
}

// Run if executed directly
build().catch(console.error)
