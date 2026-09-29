import type { AppState, Note, SortMode, Task, TaskFilter, ThemeName } from '../types';
import { createNote, type NoteDraft } from '../lib/noteUtils';
import { createEmptyState, createSampleState, DEFAULT_FILTER } from '../lib/schema';
import { createTask, moveTask, type TaskDraft } from '../lib/taskUtils';

/**
 * Actions carry an optional `at` timestamp so the reducer stays deterministic in tests.
 * Every mutation refreshes `updatedAt` on the record it touches.
 */
export type AppAction =
  | { type: 'task/add'; draft: TaskDraft; at?: string }
  | { type: 'task/update'; id: string; draft: TaskDraft; at?: string }
  | { type: 'task/toggle'; id: string; at?: string }
  | { type: 'task/delete'; id: string }
  | { type: 'task/restore'; task: Task; index: number }
  | { type: 'task/reorder'; fromId: string; toId: string }
  | { type: 'task/log-focus'; id: string; at?: string }
  | { type: 'note/add'; draft: NoteDraft; at?: string }
  | { type: 'note/update'; id: string; patch: Partial<Omit<Note, 'id' | 'createdAt'>>; at?: string }
  | { type: 'note/delete'; id: string }
  | { type: 'note/restore'; note: Note }
  | { type: 'theme/set'; theme: ThemeName }
  | { type: 'theme/toggle' }
  | { type: 'sort/set'; sort: SortMode }
  | { type: 'filter/set'; patch: Partial<TaskFilter> }
  | { type: 'filter/reset' }
  | { type: 'data/clear-completed' }
  | { type: 'data/replace'; state: AppState }
  | { type: 'data/reset'; theme: ThemeName }
  | { type: 'data/seed' };

function nowISO(at?: string): string {
  return at ?? new Date().toISOString();
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'task/add': {
      const created = createTask(action.draft, new Date(nowISO(action.at)));
      return { ...state, tasks: [created, ...state.tasks] };
    }

    case 'task/update': {
      const timestamp = nowISO(action.at);
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id
            ? {
                ...task,
                ...action.draft,
                title: action.draft.title.trim() || task.title,
                description: (action.draft.description ?? '').trim(),
                tags: action.draft.tags ?? [],
                dueDate: action.draft.dueDate ?? null,
                priority: action.draft.priority ?? task.priority,
                updatedAt: timestamp,
              }
            : task,
        ),
      };
    }

    case 'task/toggle': {
      const timestamp = nowISO(action.at);
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id
            ? {
                ...task,
                done: !task.done,
                completedAt: task.done ? null : timestamp,
                updatedAt: timestamp,
              }
            : task,
        ),
      };
    }

    case 'task/delete':
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) };

    case 'task/restore': {
      if (state.tasks.some((task) => task.id === action.task.id)) return state;
      const tasks = [...state.tasks];
      const index = Math.min(Math.max(action.index, 0), tasks.length);
      tasks.splice(index, 0, action.task);
      return { ...state, tasks };
    }

    case 'task/reorder':
      return { ...state, tasks: moveTask(state.tasks, action.fromId, action.toId) };

    case 'task/log-focus': {
      const timestamp = nowISO(action.at);
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id
            ? { ...task, focusSessions: task.focusSessions + 1, updatedAt: timestamp }
            : task,
        ),
      };
    }

    case 'note/add': {
      const created = createNote(action.draft, new Date(nowISO(action.at)));
      return { ...state, notes: [created, ...state.notes] };
    }

    case 'note/update': {
      const timestamp = nowISO(action.at);
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, ...action.patch, updatedAt: timestamp } : note,
        ),
      };
    }

    case 'note/delete':
      return { ...state, notes: state.notes.filter((note) => note.id !== action.id) };

    case 'note/restore': {
      if (state.notes.some((note) => note.id === action.note.id)) return state;
      return { ...state, notes: [action.note, ...state.notes] };
    }

    case 'theme/set':
      return { ...state, theme: action.theme };

    case 'theme/toggle':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };

    case 'sort/set':
      return { ...state, sort: action.sort };

    case 'filter/set':
      return { ...state, filter: { ...state.filter, ...action.patch } };

    case 'filter/reset':
      return { ...state, filter: { ...DEFAULT_FILTER } };

    case 'data/clear-completed':
      return { ...state, tasks: state.tasks.filter((task) => !task.done) };

    case 'data/replace':
      // Notes pointing at tasks that no longer exist are unlinked rather than dropped.
      return {
        ...action.state,
        notes: action.state.notes.map((note) =>
          note.taskId && !action.state.tasks.some((task) => task.id === note.taskId)
            ? { ...note, taskId: null }
            : note,
        ),
      };

    case 'data/reset':
      return createEmptyState(action.theme);

    case 'data/seed':
      return createSampleState();

    default:
      return state;
  }
}
