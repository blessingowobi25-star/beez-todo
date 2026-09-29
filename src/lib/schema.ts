import type { AppState, Note, NoteColor, Priority, SortMode, Task, TaskFilter, TaskStatusFilter, ThemeName } from '../types';
import { normalizeTag } from './taskUtils';

/** Bump when the persisted shape changes and add a forward-fix in `migrate`. */
export const SCHEMA_VERSION = 2;

export const DEFAULT_FILTER: TaskFilter = {
  query: '',
  status: 'all',
  priority: 'all',
  tag: 'all',
};

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const STATUS_FILTERS: TaskStatusFilter[] = ['all', 'active', 'completed', 'overdue', 'today'];
const SORT_MODES: SortMode[] = ['manual', 'due', 'priority', 'created', 'alphabetical'];
const THEMES: ThemeName[] = ['light', 'dark'];
const NOTE_COLOR_VALUES: NoteColor[] = ['amber', 'rose', 'sky', 'emerald', 'violet', 'slate'];
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Accepts only strings that parse to a real Date, otherwise returns the fallback. */
function asISOTimestamp(value: unknown, fallback: string | null): string | null {
  if (typeof value !== 'string') return fallback;
  return Number.isNaN(new Date(value).getTime()) ? fallback : value;
}

function asTagList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((tag): tag is string => typeof tag === 'string')
        .map(normalizeTag)
        .filter(Boolean),
    ),
  );
}

/**
 * Validates untrusted task data (localStorage or an imported backup).
 * Returns null when the record is unusable so callers can skip it.
 */
export function parseTask(raw: unknown, now: Date = new Date()): Task | null {
  if (!isRecord(raw)) return null;
  const title = asString(raw.title).trim();
  if (!title) return null;

  const createdAt = asISOTimestamp(raw.createdAt, now.toISOString()) ?? now.toISOString();
  const done = asBoolean(raw.done);

  return {
    id: asString(raw.id) || `task_${Math.random().toString(36).slice(2, 10)}`,
    title,
    description: asString(raw.description),
    done,
    priority: asOneOf<Priority>(raw.priority, PRIORITIES, 'medium'),
    dueDate: typeof raw.dueDate === 'string' && ISO_DATE_PATTERN.test(raw.dueDate) ? raw.dueDate : null,
    tags: asTagList(raw.tags),
    createdAt,
    updatedAt: asISOTimestamp(raw.updatedAt, createdAt) ?? createdAt,
    completedAt: done ? asISOTimestamp(raw.completedAt, createdAt) : null,
    focusSessions:
      typeof raw.focusSessions === 'number' && Number.isFinite(raw.focusSessions)
        ? Math.max(0, Math.floor(raw.focusSessions))
        : 0,
  };
}

export function parseNote(raw: unknown, now: Date = new Date()): Note | null {
  if (!isRecord(raw)) return null;
  const body = asString(raw.body);
  const title = asString(raw.title).trim();
  if (!title && !body.trim()) return null;

  const createdAt = asISOTimestamp(raw.createdAt, now.toISOString()) ?? now.toISOString();

  return {
    id: asString(raw.id) || `note_${Math.random().toString(36).slice(2, 10)}`,
    title: title || 'Untitled note',
    body,
    color: asOneOf<NoteColor>(raw.color, NOTE_COLOR_VALUES, 'amber'),
    pinned: asBoolean(raw.pinned),
    taskId: typeof raw.taskId === 'string' && raw.taskId ? raw.taskId : null,
    createdAt,
    updatedAt: asISOTimestamp(raw.updatedAt, createdAt) ?? createdAt,
  };
}

export function parseFilter(raw: unknown): TaskFilter {
  if (!isRecord(raw)) return { ...DEFAULT_FILTER };
  return {
    query: asString(raw.query),
    status: asOneOf<TaskStatusFilter>(raw.status, STATUS_FILTERS, 'all'),
    priority: asOneOf<Priority | 'all'>(raw.priority, [...PRIORITIES, 'all'], 'all'),
    tag: asString(raw.tag, 'all') || 'all',
  };
}

/** Applies forward-compatible fixes to older payloads. Safe to call on current data. */
export function migrate(state: AppState): AppState {
  const tasks = state.tasks.map((task) => ({
    ...task,
    tags: task.tags ?? [],
    focusSessions: task.focusSessions ?? 0,
  }));
  return { ...state, version: SCHEMA_VERSION, tasks };
}

/**
 * Defensive parse of anything claiming to be app state: unknown fields are dropped,
 * malformed tasks/notes are skipped, and notes pointing at missing tasks are unlinked.
 */
export function parseState(raw: unknown, now: Date = new Date()): AppState {
  if (!isRecord(raw)) throw new Error('Backup is not a BeezTodo object.');
  if (!('tasks' in raw) && !('notes' in raw)) {
    throw new Error('Backup does not contain a "tasks" or "notes" list.');
  }

  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  const rawNotes = Array.isArray(raw.notes) ? raw.notes : [];

  const tasks = rawTasks
    .map((task) => parseTask(task, now))
    .filter((task): task is Task => task !== null);

  const taskIds = new Set(tasks.map((task) => task.id));
  const notes = rawNotes
    .map((note) => parseNote(note, now))
    .filter((note): note is Note => note !== null)
    .map((note) => (note.taskId && !taskIds.has(note.taskId) ? { ...note, taskId: null } : note));

  return migrate({
    version: typeof raw.version === 'number' ? raw.version : SCHEMA_VERSION,
    tasks,
    notes,
    theme: asOneOf<ThemeName>(raw.theme, THEMES, 'light'),
    sort: asOneOf<SortMode>(raw.sort, SORT_MODES, 'manual'),
    filter: parseFilter(raw.filter),
  });
}

export function serializeState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

import { addDaysISO, todayISO } from './date';
import { createNote } from './noteUtils';
import { createTask } from './taskUtils';

/** First-run sample content so a fresh deployment is never an empty page. */
export function createSeedState(now: Date = new Date()): AppState {
  const today = todayISO(now);

  const kickoffTask = createTask(
    {
      title: 'Try BeezTodo: add your first task',
      description: 'Type a title, press Enter, then tick the checkbox to complete it.',
      priority: 'high',
      dueDate: today,
      tags: ['getting-started'],
    },
    now,
  );

  const notesTask = createTask(
    {
      title: 'Capture an idea in the Notes panel',
      description: 'Notes can stand alone or be attached to a task.',
      priority: 'medium',
      dueDate: addDaysISO(today, 2),
      tags: ['getting-started', 'notes'],
    },
    now,
  );

  const focusTask = createTask(
    {
      title: 'Run a 25 minute focus session',
      description: 'Pick this task in the focus timer and press Start.',
      priority: 'medium',
      dueDate: addDaysISO(today, 3),
      tags: ['focus'],
    },
    now,
  );

  const designTask: Task = {
    ...createTask({ title: 'Sketch the layout of the app', priority: 'low', tags: ['design'] }, now),
    done: true,
    completedAt: now.toISOString(),
    focusSessions: 1,
  };

  const welcomeNote = {
    ...createNote(
      {
        title: 'Welcome to BeezTodo 👋',
        body: [
          'Everything you type is saved in this browser instantly - no account, no server.',
          '',
          'Worth trying:',
          '- Drag tasks to reorder them',
          '- Filter by Today or Overdue, or press "/" to search',
          '- Export a JSON backup from the header menu',
        ].join('\n'),
        color: 'violet',
      },
      now,
    ),
    pinned: true,
  };

  const deployNote = createNote(
    {
      title: 'Deploy checklist',
      body: ['1. npm run test', '2. npm run build', '3. Deploy dist/ to Vercel', '4. Submit the live URL'].join(
        '\n',
      ),
      color: 'emerald',
      taskId: focusTask.id,
    },
    now,
  );

  return {
    version: SCHEMA_VERSION,
    tasks: [kickoffTask, notesTask, focusTask, designTask],
    notes: [welcomeNote, deployNote],
    theme: 'light',
    sort: 'manual',
    filter: { ...DEFAULT_FILTER },
  };
}

/** Blank slate used by "Reset data". */
export function createEmptyState(theme: ThemeName): AppState {
  return {
    version: SCHEMA_VERSION,
    tasks: [],
    notes: [],
    theme,
    sort: 'manual',
    filter: { ...DEFAULT_FILTER },
  };
}


