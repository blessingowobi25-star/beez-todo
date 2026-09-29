import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { FilterBar } from './components/FilterBar';
import { FocusTimer } from './components/FocusTimer';
import { Header } from './components/Header';
import { NotesPanel } from './components/NotesPanel';
import { StatsBar } from './components/StatsBar';
import { TaskComposer } from './components/TaskComposer';
import { TaskEditor } from './components/TaskEditor';
import { TaskList } from './components/TaskList';
import { Toast } from './components/Toast';
import { MonthCalendar } from './components/MonthCalendar';
import { useAppState } from './hooks/useAppState';
import { formatLongDate, isDueToday, isOverdue } from './lib/date';
import type { TaskDraft } from './lib/taskUtils';
import type { TaskStatusFilter } from './types';

export type MobileSection = 'home' | 'calendar' | 'focus' | 'notes';

export default function App() {
  const store = useAppState();
  const { state, stats, today } = store;

  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [section, setSection] = useState<MobileSection>('home');
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

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
  const dayCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of state.tasks) {
      if (!task.dueDate || task.done) continue;
      map.set(task.dueDate, (map.get(task.dueDate) ?? 0) + 1);
    }
    return map;
  }, [state.tasks]);
  const visibleTasks = useMemo(() => {
    if (!calendarDate) return store.visibleTasks;
    return store.visibleTasks.filter((task) => task.dueDate === calendarDate);
  }, [store.visibleTasks, calendarDate]);
  // Both the composer and the stat tiles change the filter, so a new task could
  // land off-screen behind "Overdue" or a day the user had tapped earlier.
  function addTask(draft: TaskDraft) {
    store.addTask(draft);
    store.resetFilter();
    setCalendarDate(null);
    setSection('home');
  }

  // Stat tiles are shortcuts into the list; they must also drop any day filter,
  // otherwise tapping "Overdue" looks like it did nothing.
  function showStatus(status: TaskStatusFilter) {
    store.setFilter({ status });
    setCalendarDate(null);
    setSection('home');
  }

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

      <div className="app__mobile-pane" data-active={section === 'calendar'}>
        <MonthCalendar
          today={today}
          selectedDate={calendarDate ?? today}
          counts={dayCounts}
          onSelectDate={(date) => {
            setCalendarDate(date);
            setSection('calendar');
          }}
          onShowAll={() => setCalendarDate(null)}
        />
      </div>

      <main className="app__main">
        <div className="app__column app__column--tasks" data-active={section === 'home' || section === 'calendar'}>
          <StatsBar
            stats={stats}
            onShowAll={() => showStatus('all')}
            onShowToday={() => showStatus('today')}
            onShowOverdue={() => showStatus('overdue')}
          />

          <TaskComposer inputRef={composerRef} onAdd={addTask} />

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

          {calendarDate ? (
            <p className="muted calendar-filter">
              Showing tasks due {formatLongDate(calendarDate)}.
              <button type="button" className="button button--ghost" onClick={() => setCalendarDate(null)}>
                Clear date
              </button>
            </p>
          ) : null}

          <TaskList
            tasks={visibleTasks}
            notes={state.notes}
            today={today}
            sort={state.sort}
            completedCount={stats.completed}
            hasTasks={state.tasks.length > 0}
            onToggle={store.toggleTask}
            onEdit={(task) => setEditingTaskId(task.id)}
            onDelete={store.deleteTask}
            onFocusTask={(id) => {
              setFocusTaskId(id);
              setSection('focus');
            }}
            onReorder={store.reorderTask}
            onTagClick={(tag) => store.setFilter({ tag })}
            onClearCompleted={store.clearCompleted}
            onResetFilters={store.resetFilter}
          />
        </div>

        <aside className="app__column app__column--side">
          <div className="app__mobile-pane" data-active={section === 'focus'}>
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
          </div>

          <div className="app__mobile-pane" data-active={section === 'notes'}>
            <NotesPanel
              notes={state.notes}
              tasks={state.tasks}
              onAdd={store.addNote}
              onUpdate={store.updateNote}
              onDelete={store.deleteNote}
            />
          </div>
        </aside>
      </main>

      <BottomNav active={section} onChange={setSection} />

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
