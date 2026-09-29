import type { Priority, SortMode, Task, TaskFilter, TaskStats } from '../types';
import { calendarDaysBetween, isDueToday, isOverdue, todayISO } from './date';

/** Lower number = more urgent, which keeps `sortTasks` readable. */
export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export const PRIORITY_VALUES: Priority[] = ['high', 'medium', 'low'];

/** The shape accepted by the task composer and the task editor. */
export interface TaskDraft {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  tags?: string[];
}

/** Trims, drops a leading `#` and lowercases so tags compare reliably. */
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#+/, '').toLowerCase();
}

/** Turns `"Docs, #launch , docs"` into `['docs', 'launch']`. */
export function parseTags(input: string): string[] {
  return Array.from(new Set(input.split(',').map(normalizeTag).filter(Boolean)));
}

/** Every distinct tag in the list, alphabetically sorted for the filter dropdown. */
export function collectTags(tasks: Task[]): string[] {
  return Array.from(new Set(tasks.flatMap((task) => task.tags))).sort((a, b) => a.localeCompare(b));
}

export function matchesQuery(task: Task, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [task.title, task.description, ...task.tags].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

export function matchesFilter(task: Task, filter: TaskFilter, today: string = todayISO()): boolean {
  if (!matchesQuery(task, filter.query)) return false;
  if (filter.priority !== 'all' && task.priority !== filter.priority) return false;
  if (filter.tag !== 'all' && !task.tags.includes(filter.tag)) return false;

  switch (filter.status) {
    case 'active':
      return !task.done;
    case 'completed':
      return task.done;
    case 'overdue':
      return !task.done && isOverdue(task.dueDate, today);
    case 'today':
      return !task.done && isDueToday(task.dueDate, today);
    case 'all':
    default:
      return true;
  }
}

export function filterTasks(tasks: Task[], filter: TaskFilter, today: string = todayISO()): Task[] {
  return tasks.filter((task) => matchesFilter(task, filter, today));
}

function compareDueDate(a: Task, b: Task): number {
  if (a.dueDate === b.dueDate) return 0;
  if (!a.dueDate) return 1; // tasks without a deadline sink to the bottom
  if (!b.dueDate) return -1;
  return a.dueDate < b.dueDate ? -1 : 1;
}

/**
 * Returns a sorted copy of the list. `manual` keeps the user's drag-and-drop order;
 * every other mode pushes completed work to the bottom so active work stays on top.
 */
export function sortTasks(tasks: Task[], sort: SortMode): Task[] {
  if (sort === 'manual') return [...tasks];

  const copy = [...tasks];
  copy.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;

    switch (sort) {
      case 'due': {
        const byDue = compareDueDate(a, b);
        return byDue !== 0 ? byDue : PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      case 'priority': {
        const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        return byPriority !== 0 ? byPriority : compareDueDate(a, b);
      }
      case 'created':
        return b.createdAt.localeCompare(a.createdAt);
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
  return copy;
}

/** Moves `fromId` so it sits at the position currently held by `toId` (drag-and-drop reorder). */
export function moveTask(tasks: Task[], fromId: string, toId: string): Task[] {
  const fromIndex = tasks.findIndex((task) => task.id === fromId);
  const toIndex = tasks.findIndex((task) => task.id === toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return tasks;

  const next = [...tasks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function computeStats(tasks: Task[], today: string = todayISO()): TaskStats {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.done).length;
  const overdue = tasks.filter((task) => !task.done && isOverdue(task.dueDate, today)).length;
  const dueToday = tasks.filter((task) => !task.done && isDueToday(task.dueDate, today)).length;
  const focusSessions = tasks.reduce((sum, task) => sum + task.focusSessions, 0);

  return {
    total,
    active: total - completed,
    completed,
    overdue,
    dueToday,
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    focusSessions,
  };
}

/** Builds a new task from a draft, applying safe defaults. */
export function createTask(draft: TaskDraft, now: Date = new Date()): Task {
  const timestamp = now.toISOString();
  return {
    id: `task_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    title: draft.title.trim(),
    description: (draft.description ?? '').trim(),
    done: false,
    priority: draft.priority ?? 'medium',
    dueDate: draft.dueDate ?? null,
    tags: draft.tags ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    focusSessions: 0,
  };
}

/** Sorts by urgency for the "up next" hint in the UI. */
export function compareByUrgency(a: Task, b: Task): number {
  const byDue = compareDueDate(a, b);
  return byDue !== 0 ? byDue : PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

/** Days until the due date; used by the stats "today" bucket. */
export function daysUntilDue(task: Task, today: string = todayISO()): number | null {
  return task.dueDate ? calendarDaysBetween(today, task.dueDate) : null;
}
