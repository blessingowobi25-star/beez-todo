import { useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import type { Priority } from '../types';
import { addDaysISO, todayISO } from '../lib/date';
import { PRIORITY_LABELS, PRIORITY_VALUES, parseTags, type TaskDraft } from '../lib/taskUtils';
import { IconPlus } from './icons';

interface TaskComposerProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onAdd: (draft: TaskDraft) => void;
}

/** Quick-add form: title + due date + priority, with an optional description/tags panel. */
export function TaskComposer({ inputRef, onAdd }: TaskComposerProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onAdd({
      title: trimmed,
      description,
      priority,
      dueDate: dueDate || null,
      tags: parseTags(tags),
    });

    setTitle('');
    setDescription('');
    setTags('');
    setDueDate('');
    setDetailsOpen(false);
    inputRef.current?.focus();
  }

  return (
    <form className="composer card" onSubmit={handleSubmit} aria-label="Add a task">
      <div className="composer__row">
        <input
          ref={inputRef}
          className="input composer__title"
          placeholder="What needs to be done?"
          aria-label="Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <input
          type="date"
          className="input composer__date"
          aria-label="Due date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />

        <select
          className="input composer__priority"
          aria-label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
        >
          {PRIORITY_VALUES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>

        <button type="submit" className="button button--primary" disabled={!title.trim()}>
          <IconPlus width={16} height={16} /> Add task
        </button>
      </div>

      <div className="composer__meta">
        <div className="chip-row">
          <button type="button" className="chip" onClick={() => setDueDate(todayISO())}>
            Today
          </button>
          <button type="button" className="chip" onClick={() => setDueDate(addDaysISO(todayISO(), 1))}>
            Tomorrow
          </button>
          <button type="button" className="chip" onClick={() => setDueDate(addDaysISO(todayISO(), 7))}>
            Next week
          </button>
          {dueDate ? (
            <button type="button" className="chip chip--muted" onClick={() => setDueDate('')}>
              Clear date
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className="button button--ghost"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? 'Hide details' : 'Add details'}
        </button>
      </div>

      {detailsOpen ? (
        <div className="composer__details">
          <textarea
            className="input composer__description"
            placeholder="Description (optional)"
            aria-label="Task description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <input
            className="input"
            placeholder="Tags, comma separated (e.g. docs, launch)"
            aria-label="Tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </div>
      ) : null}
    </form>
  );
}
