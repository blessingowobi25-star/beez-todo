import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import type { AppState, Note, SortMode, Task, TaskFilter, ThemeName } from '../types';
import { todayISO } from '../lib/date';
import type { NoteDraft } from '../lib/noteUtils';
import { loadState, resolveInitialTheme, saveState } from '../lib/persistence';
import { createSeedState } from '../lib/schema';
import { collectTags, computeStats, filterTasks, sortTasks, type TaskDraft } from '../lib/taskUtils';
import { appReducer, type AppAction } from '../state/appReducer';

export interface UndoSnapshot {
  kind: 'task' | 'note';
  task?: Task;
  index?: number;
  note?: Note;
  message: string;
}

export interface AppStore {
  state: AppState;
  today: string;
  visibleTasks: Task[];
  stats: ReturnType<typeof computeStats>;
  tags: string[];
  undo: UndoSnapshot | null;
  dismissUndo: () => void;
  restoreUndo: () => void;
  addTask: (draft: TaskDraft) => void;
  updateTask: (id: string, draft: TaskDraft) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  reorderTask: (fromId: string, toId: string) => void;
  logFocusSession: (id: string) => void;
  clearCompleted: () => void;
  addNote: (draft: NoteDraft) => void;
  updateNote: (id: string, patch: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  deleteNote: (id: string) => void;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  setSort: (sort: SortMode) => void;
  setFilter: (patch: Partial<TaskFilter>) => void;
  resetFilter: () => void;
  replaceState: (state: AppState) => void;
  resetData: () => void;
  loadSampleData: () => void;
}

/** Reads persisted state, seeding sample content on the very first visit. */
function initState(): AppState {
  const persisted = loadState();
  const theme = persisted?.theme ?? resolveInitialTheme();
  if (persisted) return { ...persisted, theme };
  return { ...createSeedState(), theme };
}

/**
 * Single app store: reducer + persistence + derived selectors.
 * Components never touch localStorage directly (see AGENTS.md).
 */
export function useAppState(): AppStore {
  const [state, dispatch] = useReducer(appReducer, undefined, initState);
  const [undo, setUndo] = useState<UndoSnapshot | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  // The undo toast is transient: clear it automatically after a short window.
  useEffect(() => {
    if (!undo) return undefined;
    const timeout = window.setTimeout(() => setUndo(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [undo]);

  const today = todayISO();
  const visibleTasks = useMemo(
    () => sortTasks(filterTasks(state.tasks, state.filter, today), state.sort),
    [state.tasks, state.filter, state.sort, today],
  );
  const stats = useMemo(() => computeStats(state.tasks, today), [state.tasks, today]);
  const tags = useMemo(() => collectTags(state.tasks), [state.tasks]);

  const send = useCallback((action: AppAction) => dispatch(action), []);

  const deleteTask = useCallback(
    (id: string) => {
      const index = state.tasks.findIndex((task) => task.id === id);
      const task = state.tasks[index];
      if (!task) return;
      send({ type: 'task/delete', id });
      setUndo({ kind: 'task', task, index, message: `Deleted "${task.title}"` });
    },
    [send, state.tasks],
  );

  const deleteNote = useCallback(
    (id: string) => {
      const note = state.notes.find((candidate) => candidate.id === id);
      if (!note) return;
      send({ type: 'note/delete', id });
      setUndo({ kind: 'note', note, message: `Deleted note "${note.title}"` });
    },
    [send, state.notes],
  );

  const restoreUndo = useCallback(() => {
    setUndo((current) => {
      if (!current) return null;
      if (current.kind === 'task' && current.task) {
        send({ type: 'task/restore', task: current.task, index: current.index ?? 0 });
      }
      if (current.kind === 'note' && current.note) {
        send({ type: 'note/restore', note: current.note });
      }
      return null;
    });
  }, [send]);

  return {
    state,
    today,
    visibleTasks,
    stats,
    tags,
    undo,
    dismissUndo: useCallback(() => setUndo(null), []),
    restoreUndo,
    addTask: useCallback((draft: TaskDraft) => send({ type: 'task/add', draft }), [send]),
    updateTask: useCallback(
      (id: string, draft: TaskDraft) => send({ type: 'task/update', id, draft }),
      [send],
    ),
    toggleTask: useCallback((id: string) => send({ type: 'task/toggle', id }), [send]),
    deleteTask,
    reorderTask: useCallback(
      (fromId: string, toId: string) => send({ type: 'task/reorder', fromId, toId }),
      [send],
    ),
    logFocusSession: useCallback((id: string) => send({ type: 'task/log-focus', id }), [send]),
    clearCompleted: useCallback(() => send({ type: 'data/clear-completed' }), [send]),
    addNote: useCallback((draft: NoteDraft) => send({ type: 'note/add', draft }), [send]),
    updateNote: useCallback(
      (id: string, patch: Partial<Omit<Note, 'id' | 'createdAt'>>) =>
        send({ type: 'note/update', id, patch }),
      [send],
    ),
    deleteNote,
    setTheme: useCallback((theme: ThemeName) => send({ type: 'theme/set', theme }), [send]),
    toggleTheme: useCallback(() => send({ type: 'theme/toggle' }), [send]),
    setSort: useCallback((sort: SortMode) => send({ type: 'sort/set', sort }), [send]),
    setFilter: useCallback(
      (patch: Partial<TaskFilter>) => send({ type: 'filter/set', patch }),
      [send],
    ),
    resetFilter: useCallback(() => send({ type: 'filter/reset' }), [send]),
    replaceState: useCallback((next: AppState) => send({ type: 'data/replace', state: next }), [send]),
    resetData: useCallback(() => send({ type: 'data/reset', theme: state.theme }), [send, state.theme]),
    loadSampleData: useCallback(() => send({ type: 'data/seed' }), [send]),
  };
}

