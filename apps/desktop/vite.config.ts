import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Provide browser-compatible stubs for Node.js modules used by @anthropic-ai/claude-agent-sdk
      // Note: fs/promises MUST come before fs to prevent incorrect path resolution
      { find: 'fs/promises', replacement: path.resolve(__dirname, './src/polyfills/fs-promises.ts') },
      { find: 'fs', replacement: path.resolve(__dirname, './src/polyfills/fs.ts') },
      { find: 'events', replacement: path.resolve(__dirname, './src/polyfills/events.ts') },
      { find: 'path', replacement: path.resolve(__dirname, './src/polyfills/path.ts') },
      { find: 'child_process', replacement: path.resolve(__dirname, './src/polyfills/child_process.ts') },
      { find: 'os', replacement: path.resolve(__dirname, './src/polyfills/os.ts') },
      { find: 'url', replacement: path.resolve(__dirname, './src/polyfills/url.ts') },
      { find: 'readline', replacement: path.resolve(__dirname, './src/polyfills/readline.ts') },
      { find: 'process', replacement: path.resolve(__dirname, './src/polyfills/process.ts') },
      { find: 'crypto', replacement: path.resolve(__dirname, './src/polyfills/crypto.ts') },
    ],
  },
  define: {
    global: 'globalThis',
  },
  // Optimize barrel file imports for faster dev startup and smaller bundles
  optimizeDeps: {
    include: ['lucide-react'],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
