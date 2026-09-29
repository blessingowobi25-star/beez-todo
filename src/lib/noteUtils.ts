import type { Note, NoteColor } from '../types';

export const NOTE_COLORS: NoteColor[] = ['amber', 'rose', 'sky', 'emerald', 'violet', 'slate'];

export interface NoteDraft {
  title: string;
  body: string;
  color?: NoteColor;
  taskId?: string | null;
}

export function createNote(draft: NoteDraft, now: Date = new Date()): Note {
  const timestamp = now.toISOString();
  return {
    id: `note_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    title: draft.title.trim() || 'Untitled note',
    body: draft.body.trim(),
    color: draft.color ?? 'amber',
    pinned: false,
    taskId: draft.taskId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function matchesNoteQuery(note: Note, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return note.title.toLowerCase().includes(needle) || note.body.toLowerCase().includes(needle);
}

/** Pinned notes first, then most recently updated. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function filterNotes(notes: Note[], query: string, taskId: string | null | undefined): Note[] {
  return sortNotes(
    notes.filter((note) => {
      if (taskId !== undefined && note.taskId !== taskId) return false;
      return matchesNoteQuery(note, query);
    }),
  );
}

/** One-line preview shown on the collapsed note card. */
export function notePreview(note: Note, maxLength = 120): string {
  const flat = note.body.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLength) return flat;
  return `${flat.slice(0, maxLength).trimEnd()}…`;
}

export function countNotesForTask(notes: Note[], taskId: string): number {
  return notes.filter((note) => note.taskId === taskId).length;
}
