import type { AppState, ThemeName } from '../types';
import { parseState, serializeState } from './schema';

export const STORAGE_KEY = 'taskflow:state';
/** Mirrored theme so `index.html` can paint the right colours before React boots. */
export const PREFS_KEY = 'taskflow:prefs';

function localStorageRef(): Storage | null {
  try {
    return typeof window === 'undefined' || !window.localStorage ? null : window.localStorage;
  } catch {
    // Access throws when storage is blocked by the browser; degrade to memory-only state.
    return null;
  }
}

/** Reads persisted state; returns null when absent or corrupt so callers can seed defaults. */
export function loadState(now: Date = new Date()): AppState | null {
  const storage = localStorageRef();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseState(JSON.parse(raw), now);
  } catch {
    // Corrupt payload: start fresh instead of crashing the app.
    return null;
  }
}

export function saveState(state: AppState): void {
  const storage = localStorageRef();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    storage.setItem(PREFS_KEY, JSON.stringify({ theme: state.theme }));
  } catch {
    // Quota/private-mode errors are non-fatal: the session keeps working in memory.
  }
}

export function clearState(): void {
  const storage = localStorageRef();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(PREFS_KEY);
  } catch {
    // ignore
  }
}

export function exportState(state: AppState): string {
  return serializeState(state);
}

/** Parses an exported backup, throwing a user-facing message when it is unusable. */
export function importState(raw: string, now: Date = new Date()): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  return parseState(parsed, now);
}

/** Triggers a browser download of the current data as a JSON backup. */
export function downloadBackup(state: AppState, fileName: string): void {
  const blob = new Blob([exportState(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function resolveInitialTheme(): ThemeName {
  const storage = localStorageRef();
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const stored = storage?.getItem(PREFS_KEY);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        const theme =
          parsed && typeof parsed === 'object' ? (parsed as { theme?: unknown }).theme : undefined;
        if (theme === 'light' || theme === 'dark') return theme;
      } catch {
        // ignore malformed prefs and fall through to the OS preference
      }
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}
