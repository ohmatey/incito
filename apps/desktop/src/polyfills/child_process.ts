// Browser stub for Node.js child_process module
// @anthropic-ai/claude-agent-sdk requires this but it won't work in browser

export function spawn(): never {
  throw new Error('child_process.spawn is not available in browser')
}

export function exec(): never {
  throw new Error('child_process.exec is not available in browser')
}

export function execSync(): never {
  throw new Error('child_process.execSync is not available in browser')
}

export function fork(): never {
  throw new Error('child_process.fork is not available in browser')
}

export default {
  spawn,
  exec,
  execSync,
  fork,
}
