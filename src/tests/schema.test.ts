import { describe, expect, it } from 'vitest';
import { importState } from '../lib/persistence';
import { createSampleState, createSeedState, parseState, parseTask, SCHEMA_VERSION, serializeState } from '../lib/schema';

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

describe('createSeedState', () => {
  it('starts a new user with no tasks and only the welcome note', () => {
    const state = createSeedState(NOW);

    expect(state.tasks).toEqual([]);
    expect(state.notes).toHaveLength(1);
    expect(state.notes[0].title).toBe('Welcome to Beez');
    expect(state.notes.some((note) => note.title === 'Deploy checklist')).toBe(false);
  });
});

describe('createSampleState', () => {
  it('provides opt-in demo tasks and the same welcome note', () => {
    const state = createSampleState(NOW);

    expect(state.tasks.length).toBeGreaterThan(0);
    expect(state.notes[0].title).toBe('Welcome to Beez');
  });
});

describe('parseState', () => {
  it('throws a readable error for non-object payloads', () => {
    expect(() => parseState('nope', NOW)).toThrow('not a Beez object');
    expect(() => parseState({ hello: 'world' }, NOW)).toThrow('does not contain');
  });

  it('strips retired demo content from pre-v3 saves but keeps real user data', () => {
    const state = parseState(
      {
        version: 2,
        tasks: [
          { id: 'task_demo', title: 'Try BeezTodo: add your first task' },
          { id: 'task_mine', title: 'My real task' },
        ],
        notes: [
          { id: 'note_deploy', title: 'Deploy checklist', body: '1. npm run test' },
          { id: 'note_linked', title: 'My real note', body: 'keep me', taskId: 'task_mine' },
        ],
      },
      NOW,
    );

    expect(state.tasks.map((task) => task.id)).toEqual(['task_mine']);
    expect(state.notes.map((note) => note.id)).toEqual(['note_linked']);
    // The link to a surviving task is preserved.
    expect(state.notes[0].taskId).toBe('task_mine');
    expect(state.version).toBe(SCHEMA_VERSION);
  });

  it('unlinks a note when the migration removes the task it pointed at', () => {
    const state = parseState(
      {
        version: 2,
        tasks: [{ id: 'task_demo', title: 'Run a 25 minute focus session' }],
        notes: [{ id: 'note_mine', title: 'My real note', body: 'x', taskId: 'task_demo' }],
      },
      NOW,
    );

    expect(state.tasks).toEqual([]);
    expect(state.notes[0].taskId).toBeNull();
  });

  // The demo titles are ordinary words; a user may legitimately have typed one
  // themselves, so the filter must only apply to pre-v3 payloads.
  it('never strips a same-titled task from a current-version save', () => {
    const state = parseState(
      {
        version: SCHEMA_VERSION,
        tasks: [{ id: 'task_mine', title: 'Run a 25 minute focus session' }],
        notes: [],
      },
      NOW,
    );

    expect(state.tasks.map((task) => task.id)).toEqual(['task_mine']);
  });

  it('strips the original TaskFlow-era demo task from an already-migrated v3 save', () => {
    const state = parseState(
      {
        // Stamped v3 by the previous cleanup, so a v3-only filter would skip it.
        version: 3,
        tasks: [
          { id: 'task_old', title: 'Try TaskFlow: add your first task' },
          { id: 'task_mine', title: 'Something I wrote' },
        ],
        notes: [],
      },
      NOW,
    );

    expect(state.tasks.map((task) => task.id)).toEqual(['task_mine']);
    expect(state.version).toBe(SCHEMA_VERSION);
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
    expect(() => importState('"a string"', NOW)).toThrow('not a Beez object');
  });
});
