import { describe, expect, it } from 'vitest';
import type { AppState, Note, Task } from '../types';
import { createEmptyState } from '../lib/schema';
import { createTask } from '../lib/taskUtils';
import { appReducer } from '../state/appReducer';

const NOW = new Date('2026-09-29T09:00:00.000Z');
const AT = NOW.toISOString();

function baseState(overrides: Partial<AppState> = {}): AppState {
  const task = createTask({ title: 'Existing task' }, NOW);
  const note: Note = {
    id: 'note_1',
    title: 'Existing note',
    body: 'body',
    color: 'amber',
    pinned: false,
    taskId: task.id,
    createdAt: AT,
    updatedAt: AT,
  };
  return { ...createEmptyState('light'), tasks: [task], notes: [note], ...overrides };
}

describe('appReducer task actions', () => {
  it('prepends new tasks and stamps the provided time', () => {
    const next = appReducer(baseState(), { type: 'task/add', draft: { title: 'New task' }, at: AT });
    expect(next.tasks).toHaveLength(2);
    expect(next.tasks[0]).toMatchObject({ title: 'New task', createdAt: AT, done: false });
  });

  it('toggles completion and records completedAt', () => {
    const state = baseState();
    const doneState = appReducer(state, { type: 'task/toggle', id: state.tasks[0].id, at: AT });
    expect(doneState.tasks[0].done).toBe(true);
    expect(doneState.tasks[0].completedAt).toBe(AT);

    const undoneState = appReducer(doneState, { type: 'task/toggle', id: state.tasks[0].id, at: AT });
    expect(undoneState.tasks[0].done).toBe(false);
    expect(undoneState.tasks[0].completedAt).toBeNull();
  });

  it('updates task fields without losing the existing title', () => {
    const state = baseState();
    const next = appReducer(state, {
      type: 'task/update',
      id: state.tasks[0].id,
      draft: { title: '   ', priority: 'high', tags: ['docs'], dueDate: null },
      at: AT,
    });
    expect(next.tasks[0].title).toBe('Existing task');
    expect(next.tasks[0].priority).toBe('high');
    expect(next.tasks[0].tags).toEqual(['docs']);
    expect(next.tasks[0].updatedAt).toBe(AT);
  });

  it('deletes and restores a task at its original index', () => {
    const state = baseState();
    const removed = appReducer(state, { type: 'task/delete', id: state.tasks[0].id });
    expect(removed.tasks).toHaveLength(0);

    const restored = appReducer(removed, {
      type: 'task/restore',
      task: state.tasks[0],
      index: 0,
    });
    expect(restored.tasks.map((task) => task.title)).toEqual(['Existing task']);
  });

  it('does not duplicate a task that is restored twice', () => {
    const state = baseState();
    const task: Task = state.tasks[0];
    const once = appReducer(state, { type: 'task/restore', task, index: 0 });
    const twice = appReducer(once, { type: 'task/restore', task, index: 0 });
    expect(twice).toBe(once);
  });

  it('reorders tasks and logs focus sessions', () => {
    const second = createTask({ title: 'Second' }, NOW);
    const state = baseState({ tasks: [createTask({ title: 'First' }, NOW), second] });

    const moved = appReducer(state, { type: 'task/reorder', fromId: second.id, toId: state.tasks[0].id });
    expect(moved.tasks.map((task) => task.title)).toEqual(['Second', 'First']);

    const focused = appReducer(moved, { type: 'task/log-focus', id: second.id, at: AT });
    expect(focused.tasks.find((task) => task.id === second.id)?.focusSessions).toBe(1);
  });
});

describe('appReducer note and ui actions', () => {
  it('adds, updates, deletes and restores notes', () => {
    const state = baseState();
    const withNote = appReducer(state, {
      type: 'note/add',
      draft: { title: 'Fresh note', body: 'hello' },
      at: AT,
    });
    const created = withNote.notes.find((note) => note.title === 'Fresh note');
    expect(created).toBeDefined();
    expect(created?.taskId).toBeNull();

    const updated = appReducer(withNote, {
      type: 'note/update',
      id: created!.id,
      patch: { pinned: true },
      at: AT,
    });
    expect(updated.notes.find((note) => note.id === created!.id)?.pinned).toBe(true);

    const deleted = appReducer(updated, { type: 'note/delete', id: created!.id });
    expect(deleted.notes.some((note) => note.id === created!.id)).toBe(false);

    const restored = appReducer(deleted, { type: 'note/restore', note: created! });
    expect(restored.notes.some((note) => note.id === created!.id)).toBe(true);
  });

  it('applies filter and theme changes', () => {
    const state = baseState();
    const filtered = appReducer(state, { type: 'filter/set', patch: { status: 'overdue' } });
    expect(filtered.filter.status).toBe('overdue');
    expect(filtered.filter.query).toBe('');

    expect(appReducer(filtered, { type: 'filter/reset' }).filter.status).toBe('all');
    expect(appReducer(state, { type: 'theme/toggle' }).theme).toBe('dark');
    expect(appReducer(state, { type: 'sort/set', sort: 'priority' }).sort).toBe('priority');
  });

  it('clears completed tasks and resets or replaces state', () => {
    const finished = { ...createTask({ title: 'Finished' }, NOW), done: true };
    const state = baseState({ tasks: [createTask({ title: 'Open' }, NOW), finished] });

    const cleared = appReducer(state, { type: 'data/clear-completed' });
    expect(cleared.tasks.map((task) => task.title)).toEqual(['Open']);

    const replaced = appReducer(state, {
      type: 'data/replace',
      state: { ...createEmptyState('dark'), notes: state.notes, tasks: [] },
    });
    expect(replaced.theme).toBe('dark');
    expect(replaced.notes[0].taskId).toBeNull();

    expect(appReducer(state, { type: 'data/reset', theme: 'dark' }).tasks).toHaveLength(0);
    expect(appReducer(state, { type: 'data/seed' }).tasks.length).toBeGreaterThan(0);
  });

  it('ignores unknown actions', () => {
    const state = baseState();
    expect(appReducer(state, { type: 'nope' } as never)).toBe(state);
  });
});
