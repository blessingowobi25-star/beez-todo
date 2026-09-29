import { useEffect, useMemo, useRef, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { FocusTimer } from './components/FocusTimer';
import { Header } from './components/Header';
import { NotesPanel } from './components/NotesPanel';
import { StatsBar } from './components/StatsBar';
import { TaskComposer } from './components/TaskComposer';
import { TaskEditor } from './components/TaskEditor';
import { TaskList } from './components/TaskList';
import { Toast } from './components/Toast';
import { useAppState } from './hooks/useAppState';
import { isDueToday, isOverdue } from './lib/date';
import type { TaskStatusFilter } from './types';

export default function App() {
  const store = useAppState();
  const { state, stats, today } = store;

  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const editingTask = state.tasks.find((task) => task.id === editingTaskId) ?? null;
  const editingTaskNotes = editingTask
    ? state.notes.filter((note) => note.taskId === editingTask.id)
    : [];

  const counts = useMemo<Record<TaskStatusFilter, number>>(
    () => ({
      all: state.tasks.length,
      active: state.tasks.filter((task) => !task.done).length,
      completed: state.tasks.filter((task) => task.done).length,
      today: state.tasks.filter((task) => !task.done && isDueToday(task.dueDate, today)).length,
      overdue: state.tasks.filter((task) => !task.done && isOverdue(task.dueDate, today)).length,
    }),
    [state.tasks, today],
  );

  const { toggleTheme } = store;
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'n') {
        event.preventDefault();
        composerRef.current?.focus();
      }
      if (event.key === 'd') {
        event.preventDefault();
        toggleTheme();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  return (
    <div className="app">
      <Header
        theme={state.theme}
        state={state}
        onToggleTheme={store.toggleTheme}
        onReplaceState={store.replaceState}
        onResetData={store.resetData}
        onLoadSample={store.loadSampleData}
      />

      <main className="app__main">
        <div className="app__column app__column--tasks">
          <StatsBar
            stats={stats}
            onShowAll={() => store.setFilter({ status: 'all' })}
            onShowToday={() => store.setFilter({ status: 'today' })}
            onShowOverdue={() => store.setFilter({ status: 'overdue' })}
          />

          <TaskComposer inputRef={composerRef} onAdd={store.addTask} />

          <FilterBar
            filter={state.filter}
            sort={state.sort}
            tags={store.tags}
            counts={counts}
            searchRef={searchRef}
            onFilterChange={store.setFilter}
            onSortChange={store.setSort}
            onReset={store.resetFilter}
          />

          <TaskList
            tasks={store.visibleTasks}
            notes={state.notes}
            today={today}
            sort={state.sort}
            completedCount={stats.completed}
            hasTasks={state.tasks.length > 0}
            onToggle={store.toggleTask}
            onEdit={(task) => setEditingTaskId(task.id)}
            onDelete={store.deleteTask}
            onFocusTask={(id) => setFocusTaskId(id)}
            onReorder={store.reorderTask}
            onTagClick={(tag) => store.setFilter({ tag })}
            onClearCompleted={store.clearCompleted}
            onAddSample={store.loadSampleData}
            onResetFilters={store.resetFilter}
          />
        </div>

        <aside className="app__column app__column--side">
          <FocusTimer
            tasks={state.tasks}
            selectedTaskId={focusTaskId}
            today={today}
            onSelectTask={setFocusTaskId}
            onSessionComplete={(taskId) => {
              store.logFocusSession(taskId);
              setFocusTaskId(taskId);
            }}
          />

          <NotesPanel
            notes={state.notes}
            tasks={state.tasks}
            onAdd={store.addNote}
            onUpdate={store.updateNote}
            onDelete={store.deleteNote}
          />
        </aside>
      </main>

      <footer className="app-footer">
        <p>
          Shortcuts: <kbd>/</kbd> search · <kbd>n</kbd> new task · <kbd>d</kbd> theme · <kbd>Esc</kbd> close
          dialogs
        </p>
        <p className="app-footer__meta">
          Built with React + TypeScript + Vite. Data lives in this browser only.
        </p>
      </footer>

      {editingTask ? (
        <TaskEditor
          task={editingTask}
          notes={editingTaskNotes}
          onSave={(draft) => store.updateTask(editingTask.id, draft)}
          onClose={() => setEditingTaskId(null)}
          onDelete={() => store.deleteTask(editingTask.id)}
          onAddNote={(title, body) => store.addNote({ title, body, taskId: editingTask.id })}
          onDeleteNote={store.deleteNote}
        />
      ) : null}

      {store.undo ? (
        <Toast
          message={store.undo.message}
          actionLabel="Undo"
          onAction={store.restoreUndo}
          onDismiss={store.dismissUndo}
        />
      ) : null}
    </div>
  );
}
