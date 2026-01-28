// Browser stub for Node.js os module

export function homedir(): string {
  return '/'
}

export function platform(): string {
  return 'browser'
}

export function tmpdir(): string {
  return '/tmp'
}

export function hostname(): string {
  return 'localhost'
}

export default {
  homedir,
  platform,
  tmpdir,
  hostname,
}
