/**
 * Domain types for Beez.
 * These are the single source of truth for the shape of persisted data.
 */

export type Priority = 'low' | 'medium' | 'high';

export type ThemeName = 'light' | 'dark';

export type TaskStatusFilter = 'all' | 'active' | 'completed' | 'overdue' | 'today';

export type SortMode = 'manual' | 'due' | 'priority' | 'created' | 'alphabetical';

export type DueTone = 'none' | 'overdue' | 'today' | 'soon' | 'later';

export type NoteColor = 'amber' | 'rose' | 'sky' | 'emerald' | 'violet' | 'slate';

/** A single to-do item. Order inside the tasks array is the manual drag-and-drop order. */
export interface Task {
  id: string;
  title: string;
  description: string;
  done: boolean;
  priority: Priority;
  /** ISO calendar date, `YYYY-MM-DD`, or null when the task has no deadline. */
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** Number of completed focus-timer sessions logged against this task. */
  focusSessions: number;
}

/** A standalone note that can optionally be attached to a task. */
export interface Note {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
  /** Linked task id, or null for a free-standing note. */
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilter {
  query: string;
  status: TaskStatusFilter;
  priority: Priority | 'all';
  tag: string | 'all';
}

/** Everything that is persisted to localStorage. */
export interface AppState {
  version: number;
  tasks: Task[];
  notes: Note[];
  theme: ThemeName;
  sort: SortMode;
  filter: TaskFilter;
}

export interface TaskStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  dueToday: number;
  completionRate: number;
  focusSessions: number;
}

export interface DueInfo {
  label: string;
  tone: DueTone;
}
