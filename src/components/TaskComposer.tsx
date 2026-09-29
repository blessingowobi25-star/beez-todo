import { useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import type { Priority } from '../types';
import { addDaysISO, formatLongDate, todayISO } from '../lib/date';
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
  // The submit button is never disabled: a dead button tells the user nothing
  // about *why* nothing happened. Pressing it without a title explains itself.
  const [titleError, setTitleError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Give the task a title first.');
      inputRef.current?.focus();
      return;
    }

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
    setTitleError('');
    inputRef.current?.focus();
  }

  // A plain readable label beats the native dd/mm/yyyy segments, which looked
  // like arbitrary numbers to users and re-format per browser locale.
  const dueLabel = dueDate === todayISO() ? 'Today' : formatLongDate(dueDate);

  return (
    <form className="composer card" onSubmit={handleSubmit} aria-label="Add a task">
      <div className="composer__row">
        <input
          ref={inputRef}
          className={`input composer__title${titleError ? ' input--invalid' : ''}`}
          placeholder="What needs to be done?"
          aria-label="Task title"
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? 'composer-title-error' : undefined}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (titleError) setTitleError('');
          }}
        />

        <label className="composer__date-field">
          {/* The native picker renders dd/mm/yyyy segments that read as bare
              numbers, so a readable caption appears once a date is chosen. Left
              out entirely when empty, where the empty picker says it already. */}
          {dueDate ? <span className="composer__date-label">{dueLabel}</span> : null}
          <input
            type="date"
            className="input composer__date"
            aria-label="Due date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

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

        <button type="submit" className="button button--primary">
          <IconPlus width={16} height={16} /> Add task
        </button>
      </div>

      {titleError ? (
        <p className="composer__error" id="composer-title-error" role="status">
          {titleError}
        </p>
      ) : null}

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
          <label className="composer__field">
            <span className="composer__field-label">Description</span>
            <textarea
              className="input composer__description"
              placeholder="Add more detail (optional)"
              aria-label="Task description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="composer__field">
            <span className="composer__field-label">Tags</span>
            <input
              className="input"
              placeholder="docs, launch"
              aria-label="Tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </label>
        </div>
      ) : null}
    </form>
  );
}
