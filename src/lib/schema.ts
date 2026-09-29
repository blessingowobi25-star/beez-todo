import type { AppState, Note, NoteColor, Priority, SortMode, Task, TaskFilter, TaskStatusFilter, ThemeName } from '../types';
import { addDaysISO, todayISO } from './date';
import { createNote } from './noteUtils';
import { createTask } from './taskUtils';
import { normalizeTag } from './taskUtils';

/**
 * Bump when the persisted shape changes and add a forward-fix in `migrate`.
 *
 * 4 — widen the legacy-demo allow-list to cover the original "Try TaskFlow" title.
 *     Required: v3 saves are already stamped `version: 3`, so a v3-only cleanup
 *     would never re-run for users who had already been migrated.
 */
export const SCHEMA_VERSION = 4;

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

/**
 * Titles of the demo content that earlier versions seeded into `localStorage`.
 * Version 3 removed that seeding, so anyone who visited before the change still
 * has it saved; `migrate` drops exactly these records and nothing else.
 */
const LEGACY_DEMO_TASK_TITLES = new Set([
  // Earliest build seeded this exact wording, before the product was renamed.
  'Try TaskFlow: add your first task',
  'Try BeezTodo: add your first task',
  'Try Beez: add your first task',
  'Capture an idea in the Notes panel',
  'Run a 25 minute focus session',
  'Sketch the layout of the app',
]);

const LEGACY_DEMO_NOTE_TITLES = new Set([
  'Deploy checklist',
  'Welcome to BeezTodo 👋',
  'Welcome to BeezTodo',
]);

/** Applies forward-compatible fixes to older payloads. Safe to call on current data. */
export function migrate(state: AppState): AppState {
  // Only pre-v4 payloads can contain the retired demo content; running this on
  // newer data would risk deleting a task a user genuinely typed themselves.
  const carriesLegacyDemo = state.version < 4;

  if (!carriesLegacyDemo) return { ...state, version: SCHEMA_VERSION };

  const tasks = state.tasks
    .filter((task) => !LEGACY_DEMO_TASK_TITLES.has(task.title))
    .map((task) => ({
      ...task,
      tags: task.tags ?? [],
      focusSessions: task.focusSessions ?? 0,
    }));

  // Notes keep their taskId here: `parseState` already unlinks notes whose task
  // was dropped, and nulling every link would break legitimate attachments.
  const notes = state.notes.filter((note) => !LEGACY_DEMO_NOTE_TITLES.has(note.title));

  return { ...state, version: SCHEMA_VERSION, tasks, notes };
}

/**
 * Defensive parse of anything claiming to be app state: unknown fields are dropped,
 * malformed tasks/notes are skipped, and notes pointing at missing tasks are unlinked.
 */
export function parseState(raw: unknown, now: Date = new Date()): AppState {
  if (!isRecord(raw)) throw new Error('Backup is not a Beez object.');
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

  const migrated = migrate({
    version: typeof raw.version === 'number' ? raw.version : SCHEMA_VERSION,
    tasks,
    notes,
    theme: asOneOf<ThemeName>(raw.theme, THEMES, 'light'),
    sort: asOneOf<SortMode>(raw.sort, SORT_MODES, 'manual'),
    filter: parseFilter(raw.filter),
  });

  // Re-check links: `migrate` can drop demo tasks that were still present when
  // the orphan pass above ran, so a note would otherwise keep a dangling taskId.
  const survivingTaskIds = new Set(migrated.tasks.map((task) => task.id));
  return {
    ...migrated,
    notes: migrated.notes.map((note) =>
      note.taskId && !survivingTaskIds.has(note.taskId) ? { ...note, taskId: null } : note,
    ),
  };
}

export function serializeState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * First-run state for a brand-new user. Deliberately empty: a new visitor must
 * not see someone else's tasks, and the only seeded content is one welcome note.
 */
export function createSeedState(now: Date = new Date()): AppState {
  return {
    version: SCHEMA_VERSION,
    tasks: [],
    notes: [createWelcomeNote(now)],
    theme: 'light',
    sort: 'manual',
    filter: { ...DEFAULT_FILTER },
  };
}

function createWelcomeNote(now: Date) {
  return {
    ...createNote(
      {
        title: 'Welcome to Beez',
        body: [
          'Everything you type is saved in this browser instantly - no account, no server.',
          '',
          'Worth trying:',
          '- Add your first task using the box above',
          '- Give it a due date, then tap a day in the calendar to filter by it',
          '- Drag tasks to reorder them',
          '- Press "/" to search and "d" to switch theme',
        ].join('\n'),
        color: 'violet',
      },
      now,
    ),
    pinned: true,
  };
}

/**
 * Demo content behind the explicit "Load sample data" action. Opt-in only, so
 * it never appears on first load.
 */
export function createSampleState(now: Date = new Date()): AppState {
  const today = todayISO(now);
  const tasks = [
    createTask(
      {
        title: 'Try Beez: add your first task',
        description: 'Type a title, press Enter, then tick the checkbox to complete it.',
        priority: 'high',
        dueDate: today,
        tags: ['getting-started'],
      },
      now,
    ),
    createTask(
      {
        title: 'Capture an idea in the Notes panel',
        description: 'Notes can stand alone or be attached to a task.',
        priority: 'medium',
        dueDate: addDaysISO(today, 2),
        tags: ['notes'],
      },
      now,
    ),
    createTask(
      {
        title: 'Run a 25 minute focus session',
        description: 'Pick this task in the focus timer and press Start.',
        priority: 'medium',
        dueDate: addDaysISO(today, 3),
        tags: ['focus'],
      },
      now,
    ),
  ];

  return {
    version: SCHEMA_VERSION,
    tasks: [
      ...tasks,
      { ...createTask({ title: 'Sketch the layout of the app', priority: 'low' }, now), done: true, completedAt: now.toISOString() },
    ],
    notes: [createWelcomeNote(now)],
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


