// Browser stub for Node.js readline module

export function createInterface(): {
  on: () => void
  close: () => void
  question: () => void
} {
  return {
    on: () => {},
    close: () => {},
    question: () => {},
  }
}

export default {
  createInterface,
}
