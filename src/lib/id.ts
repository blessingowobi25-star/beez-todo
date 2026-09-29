/**
 * Identifier helper.
 * Uses crypto.randomUUID when the runtime provides it (browsers + Node 19+)
 * and falls back to a timestamp/random pair so tests and older runtimes still work.
 */
export function createId(prefix = 'id'): string {
  const cryptoApi = typeof globalThis === 'undefined' ? undefined : globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}_${cryptoApi.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
