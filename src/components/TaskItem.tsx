import type { DragEvent } from 'react';
import type { Task } from '../types';
import { describeDueDate } from '../lib/date';
import { IconCalendar, IconEdit, IconGrip, IconNote, IconPlay, IconTarget, IconTrash } from './icons';
import { PriorityBadge } from './PriorityBadge';

interface TaskItemProps {
  task: Task;
  today: string;
  noteCount: number;
  canDrag: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFocus: () => void;
  onTagClick: (tag: string) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

/** One row in the task list. Native HTML5 drag-and-drop keeps the bundle dependency-free. */
export function TaskItem({
  task,
  today,
  noteCount,
  canDrag,
  isDragging,
  isDropTarget,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  onTagClick,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: TaskItemProps) {
  const due = describeDueDate(task.dueDate, today);

  function handleDragStart(event: DragEvent<HTMLLIElement>) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
    onDragStart();
  }

  return (
    <li
      className={`task${task.done ? ' task--done' : ''}${isDragging ? ' task--dragging' : ''}${
        isDropTarget ? ' task--drop-target' : ''
      }`}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(event) => canDrag && event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      {canDrag ? (
        <span className="task__handle" aria-hidden="true" title="Drag to reorder">
          <IconGrip width={16} height={16} />
        </span>
      ) : null}

      <label className="task__check">
        <input
          type="checkbox"
          checked={task.done}
          onChange={onToggle}
          aria-label={`Mark "${task.title}" as ${task.done ? 'incomplete' : 'complete'}`}
        />
      </label>

      <div className="task__main">
        <button type="button" className="task__title" onClick={onEdit} title="Edit task">
          {task.title}
        </button>

        {task.description ? <p className="task__description">{task.description}</p> : null}

        <div className="task__meta">
          <PriorityBadge priority={task.priority} />

          {task.dueDate ? (
            <span className={`badge badge--due badge--due-${due.tone}`}>
              <IconCalendar width={13} height={13} /> {due.label}
            </span>
          ) : null}

          {task.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="badge badge--tag"
              onClick={() => onTagClick(tag)}
              title={`Filter by #${tag}`}
            >
              #{tag}
            </button>
          ))}

          {task.focusSessions > 0 ? (
            <span className="badge badge--muted" title={`${task.focusSessions} focus session(s) logged`}>
              <IconTarget width={13} height={13} /> {task.focusSessions}
            </span>
          ) : null}

          {noteCount > 0 ? (
            <span className="badge badge--muted" title={`${noteCount} linked note(s)`}>
              <IconNote width={13} height={13} /> {noteCount}
            </span>
          ) : null}
        </div>
      </div>

      <div className="task__actions">
        {!task.done ? (
          <button type="button" className="icon-button" onClick={onFocus} title="Focus on this task" aria-label={`Focus on ${task.title}`}>
            <IconPlay width={17} height={17} />
          </button>
        ) : null}
        <button type="button" className="icon-button" onClick={onEdit} title="Edit task" aria-label={`Edit ${task.title}`}>
          <IconEdit width={17} height={17} />
        </button>
        <button
          type="button"
          className="icon-button icon-button--danger"
          onClick={onDelete}
          title="Delete task"
          aria-label={`Delete ${task.title}`}
        >
          <IconTrash width={17} height={17} />
        </button>
      </div>
    </li>
  );
}
