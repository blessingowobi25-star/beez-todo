import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  collectTags,
  computeStats,
  createTask,
  filterTasks,
  matchesFilter,
  moveTask,
  parseTags,
  sortTasks,
} from '../lib/taskUtils';

const NOW = new Date('2026-09-29T09:00:00.000Z');
const TODAY = '2026-09-29';

function task(overrides: Partial<Task> = {}): Task {
  return { ...createTask({ title: 'Sample task' }, NOW), ...overrides };
}

describe('tags', () => {
  it('normalises, trims and de-duplicates tag input', () => {
    expect(parseTags('Docs, #launch , docs,,  #Release ')).toEqual(['docs', 'launch', 'release']);
    expect(parseTags('')).toEqual([]);
  });

  it('collects the distinct tags in a list, sorted', () => {
    const tasks = [task({ tags: ['zeta', 'alpha'] }), task({ tags: ['alpha'] })];
    expect(collectTags(tasks)).toEqual(['alpha', 'zeta']);
  });
});

describe('filtering', () => {
  const tasks: Task[] = [
    task({ id: 'overdue', title: 'Send invoice', dueDate: '2026-09-27', priority: 'high' }),
    task({ id: 'today', title: 'Stand-up notes', dueDate: TODAY }),
    task({ id: 'future', title: 'Plan launch', dueDate: '2026-10-10', tags: ['launch'] }),
    task({ id: 'done', title: 'Archive old notes', done: true, completedAt: NOW.toISOString() }),
  ];

  it('filters by status', () => {
    const ids = (status: 'all' | 'active' | 'completed' | 'overdue' | 'today') =>
      filterTasks(tasks, { query: '', status, priority: 'all', tag: 'all' }, TODAY).map((t) => t.id);

    expect(ids('all')).toHaveLength(4);
    expect(ids('active')).toEqual(['overdue', 'today', 'future']);
    expect(ids('completed')).toEqual(['done']);
    expect(ids('overdue')).toEqual(['overdue']);
    expect(ids('today')).toEqual(['today']);
  });

  it('filters by priority and tag, and searches titles/descriptions/tags', () => {
    expect(matchesFilter(tasks[0], { query: '', status: 'all', priority: 'high', tag: 'all' }, TODAY)).toBe(true);
    expect(matchesFilter(tasks[0], { query: '', status: 'all', priority: 'low', tag: 'all' }, TODAY)).toBe(false);
    expect(matchesFilter(tasks[2], { query: '', status: 'all', priority: 'all', tag: 'launch' }, TODAY)).toBe(true);
    expect(matchesFilter(tasks[2], { query: 'PLAN', status: 'all', priority: 'all', tag: 'all' }, TODAY)).toBe(true);
    expect(matchesFilter(tasks[2], { query: 'nope', status: 'all', priority: 'all', tag: 'all' }, TODAY)).toBe(false);
  });
});

describe('sorting', () => {
  const tasks: Task[] = [
    task({ id: 'lowNoDate', priority: 'low', createdAt: '2026-09-01T00:00:00.000Z' }),
    task({ id: 'highLate', priority: 'high', dueDate: '2026-10-20', createdAt: '2026-09-02T00:00:00.000Z' }),
    task({ id: 'mediumSoon', priority: 'medium', dueDate: '2026-09-30', createdAt: '2026-09-03T00:00:00.000Z' }),
    task({ id: 'finished', priority: 'high', done: true, dueDate: '2026-09-01', completedAt: '2026-09-05T00:00:00.000Z' }),
  ];

  it('keeps manual order untouched', () => {
    expect(sortTasks(tasks, 'manual').map((t) => t.id)).toEqual(tasks.map((t) => t.id));
  });

  it('sorts by priority with completed work last', () => {
    expect(sortTasks(tasks, 'priority').map((t) => t.id)).toEqual([
      'highLate',
      'mediumSoon',
      'lowNoDate',
      'finished',
    ]);
  });

  it('sorts by due date and pushes undated tasks last', () => {
    expect(sortTasks(tasks, 'due').map((t) => t.id)).toEqual([
      'mediumSoon',
      'highLate',
      'lowNoDate',
      'finished',
    ]);
  });

  it('sorts by newest first and alphabetically', () => {
    expect(sortTasks(tasks, 'created')[0].id).toBe('mediumSoon');

    const named = [
      task({ id: 'c', title: 'Charlie' }),
      task({ id: 'a', title: 'alpha' }),
      task({ id: 'b', title: 'Bravo' }),
    ];
    expect(sortTasks(named, 'alphabetical').map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('moveTask', () => {
  const tasks = [task({ id: 'a' }), task({ id: 'b' }), task({ id: 'c' })];

  it('moves an item to another position', () => {
    expect(moveTask(tasks, 'c', 'a').map((t) => t.id)).toEqual(['c', 'a', 'b']);
    expect(moveTask(tasks, 'a', 'c').map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('returns the original list for unknown ids', () => {
    expect(moveTask(tasks, 'missing', 'a')).toBe(tasks);
  });
});

describe('computeStats', () => {
  it('summarises progress', () => {
    const tasks = [
      task({ done: true, focusSessions: 2 }),
      task({ dueDate: TODAY }),
      task({ dueDate: '2026-09-01' }),
      task(),
    ];
    expect(computeStats(tasks, TODAY)).toEqual({
      total: 4,
      active: 3,
      completed: 1,
      overdue: 1,
      dueToday: 1,
      completionRate: 25,
      focusSessions: 2,
    });
  });

  it('handles an empty list without dividing by zero', () => {
    expect(computeStats([], TODAY).completionRate).toBe(0);
  });
});

describe('createTask', () => {
  it('applies safe defaults and timestamps', () => {
    const created = createTask({ title: '  Write docs  ' }, NOW);
    expect(created.title).toBe('Write docs');
    expect(created.done).toBe(false);
    expect(created.priority).toBe('medium');
    expect(created.dueDate).toBeNull();
    expect(created.tags).toEqual([]);
    expect(created.completedAt).toBeNull();
    expect(created.focusSessions).toBe(0);
    expect(created.createdAt).toBe(NOW.toISOString());
  });
});
