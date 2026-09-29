import { describe, expect, it } from 'vitest';
import { importState } from '../lib/persistence';
import { parseState, parseTask, SCHEMA_VERSION, serializeState } from '../lib/schema';

const NOW = new Date('2026-09-29T09:00:00.000Z');

describe('parseTask', () => {
  it('rejects records without a usable title', () => {
    expect(parseTask(null, NOW)).toBeNull();
    expect(parseTask({ title: '   ' }, NOW)).toBeNull();
    expect(parseTask({ title: 42 }, NOW)).toBeNull();
  });

  it('coerces out-of-range values back to safe defaults', () => {
    const parsed = parseTask(
      {
        title: '  Ship the app ',
        priority: 'urgent',
        dueDate: '29/09/2026',
        tags: ['#Docs', 'docs', 7, ' docs '],
        focusSessions: -4.8,
        done: 'yes',
      },
      NOW,
    );

    expect(parsed).toMatchObject({
      title: 'Ship the app',
      priority: 'medium',
      dueDate: null,
      tags: ['docs'],
      focusSessions: 0,
      done: false,
      completedAt: null,
    });
    expect(parsed?.createdAt).toBe(NOW.toISOString());
  });

  it('keeps a valid due date and completion timestamp', () => {
    const parsed = parseTask(
      { title: 'Pay bill', dueDate: '2026-10-01', done: true, completedAt: '2026-09-28T10:00:00.000Z' },
      NOW,
    );
    expect(parsed?.dueDate).toBe('2026-10-01');
    expect(parsed?.completedAt).toBe('2026-09-28T10:00:00.000Z');
  });
});

describe('parseState', () => {
  it('throws a readable error for non-object payloads', () => {
    expect(() => parseState('nope', NOW)).toThrow('not a BeezTodo object');
    expect(() => parseState({ hello: 'world' }, NOW)).toThrow('does not contain');
  });

  it('drops malformed records and unlinks orphaned notes', () => {
    const state = parseState(
      {
        version: 1,
        tasks: [{ id: 'task_1', title: 'Keep me' }, { id: 'task_2' }, 'junk'],
        notes: [
          { id: 'note_1', title: 'Linked', body: 'x', taskId: 'task_1' },
          { id: 'note_2', title: 'Orphan', body: 'y', taskId: 'task_deleted' },
          { id: 'note_3', body: '   ' },
        ],
        theme: 'dark',
        sort: 'due',
        filter: { query: 'abc', status: 'active', priority: 'high', tag: 'docs' },
      },
      NOW,
    );

    expect(state.version).toBe(SCHEMA_VERSION);
    expect(state.tasks.map((task) => task.id)).toEqual(['task_1']);
    expect(state.notes.map((note) => note.id)).toEqual(['note_1', 'note_2']);
    expect(state.notes[0].taskId).toBe('task_1');
    expect(state.notes[1].taskId).toBeNull();
    expect(state.theme).toBe('dark');
    expect(state.sort).toBe('due');
    expect(state.filter).toEqual({ query: 'abc', status: 'active', priority: 'high', tag: 'docs' });
  });

  it('falls back on invalid enum values', () => {
    const state = parseState({ tasks: [], notes: [], theme: 'neon', sort: 'chaos', filter: 5 }, NOW);
    expect(state.theme).toBe('light');
    expect(state.sort).toBe('manual');
    expect(state.filter).toEqual({ query: '', status: 'all', priority: 'all', tag: 'all' });
  });
});

describe('backup round trip', () => {
  it('serialises and re-imports state', () => {
    const original = parseState(
      { tasks: [{ id: 't1', title: 'Round trip' }], notes: [{ id: 'n1', title: 'Note', body: 'body' }] },
      NOW,
    );
    const restored = importState(serializeState(original), NOW);
    expect(restored.tasks.map((task) => task.title)).toEqual(['Round trip']);
    expect(restored.notes.map((note) => note.title)).toEqual(['Note']);
  });

  it('reports invalid files clearly', () => {
    expect(() => importState('{ not json', NOW)).toThrow('not valid JSON');
    expect(() => importState('"a string"', NOW)).toThrow('not a BeezTodo object');
  });
});
