import { useState } from 'react';
import type { Note, SortMode, Task } from '../types';
import { countNotesForTask } from '../lib/noteUtils';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  notes: Note[];
  today: string;
  sort: SortMode;
  completedCount: number;
  hasTasks: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onFocusTask: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onTagClick: (tag: string) => void;
  onClearCompleted: () => void;
  onAddSample: () => void;
  onResetFilters: () => void;
}

export function TaskList({
  tasks,
  notes,
  today,
  sort,
  completedCount,
  hasTasks,
  onToggle,
  onEdit,
  onDelete,
  onFocusTask,
  onReorder,
  onTagClick,
  onClearCompleted,
  onAddSample,
  onResetFilters,
}: TaskListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const canDrag = sort === 'manual';

  function endDrag() {
    setDraggingId(null);
    setOverId(null);
  }

  return (
    <section className="tasks card" aria-label="Task list">
      <header className="tasks__header">
        <h2 className="card__title">
          Tasks <span className="count-pill">{tasks.length}</span>
        </h2>
        <div className="tasks__header-actions">
          {completedCount > 0 ? (
            <button type="button" className="button button--ghost" onClick={onClearCompleted}>
              Clear completed ({completedCount})
            </button>
          ) : null}
        </div>
      </header>

      {tasks.length === 0 ? (
        <div className="empty">
          {hasTasks ? (
            <>
              <p className="empty__title">No tasks match your filters</p>
              <button type="button" className="button" onClick={onResetFilters}>
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="empty__title">Nothing here yet</p>
              <p className="empty__text">Add your first task above, or load the sample data to explore.</p>
              <button type="button" className="button" onClick={onAddSample}>
                Load sample data
              </button>
            </>
          )}
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              today={today}
              noteCount={countNotesForTask(notes, task.id)}
              canDrag={canDrag}
              isDragging={draggingId === task.id}
              isDropTarget={overId === task.id}
              onToggle={() => onToggle(task.id)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task.id)}
              onFocus={() => onFocusTask(task.id)}
              onTagClick={onTagClick}
              onDragStart={() => setDraggingId(task.id)}
              onDragEnter={() => {
                if (draggingId && draggingId !== task.id) setOverId(task.id);
              }}
              onDrop={() => {
                if (draggingId && draggingId !== task.id) onReorder(draggingId, task.id);
                endDrag();
              }}
              onDragEnd={endDrag}
            />
          ))}
        </ul>
      )}

      {!canDrag && tasks.length > 0 ? (
        <p className="tasks__hint">
          Drag-and-drop reordering is available in <strong>Manual order</strong> sort mode.
        </p>
      ) : null}
    </section>
  );
}
