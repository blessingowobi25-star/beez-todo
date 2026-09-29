import { useState } from 'react';
import type { Note, NoteColor, Task } from '../types';
import { formatRelativeTime } from '../lib/date';
import { NOTE_COLORS, notePreview, sortNotes } from '../lib/noteUtils';
import { IconEdit, IconNote, IconPin, IconPlus, IconTrash } from './icons';
import { Modal } from './Modal';

interface NotesPanelProps {
  notes: Note[];
  tasks: Task[];
  onAdd: (draft: { title: string; body: string; color: NoteColor; taskId: string | null }) => void;
  onUpdate: (id: string, patch: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
}

interface NoteDraftState {
  id: string | null;
  title: string;
  body: string;
  color: NoteColor;
  taskId: string;
  pinned: boolean;
}

const EMPTY_DRAFT: NoteDraftState = {
  id: null,
  title: '',
  body: '',
  color: 'amber',
  taskId: '',
  pinned: false,
};

/** Notes feature: free-standing notes plus notes linked to a task. */
export function NotesPanel({ notes, tasks, onAdd, onUpdate, onDelete }: NotesPanelProps) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<NoteDraftState | null>(null);

  const visible = sortNotes(notes).filter((note) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return note.title.toLowerCase().includes(needle) || note.body.toLowerCase().includes(needle);
  });

  function taskTitle(taskId: string | null): string | null {
    if (!taskId) return null;
    return tasks.find((task) => task.id === taskId)?.title ?? null;
  }

  function saveDraft() {
    if (!draft) return;
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title && !body) return;

    if (draft.id) {
      onUpdate(draft.id, {
        title: title || 'Untitled note',
        body,
        color: draft.color,
        pinned: draft.pinned,
        taskId: draft.taskId || null,
      });
    } else {
      onAdd({ title: title || 'Untitled note', body, color: draft.color, taskId: draft.taskId || null });
    }
    setDraft(null);
  }

  return (
    <section className="notes card notes--pink" aria-label="Notes">
      <header className="notes__header">
        <h2 className="card__title">
          <IconNote width={20} height={20} /> Notes <span className="count-pill">{notes.length}</span>
        </h2>
        <button type="button" className="button button--primary" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
          <IconPlus width={16} height={16} /> New note
        </button>
      </header>

      <input
        type="search"
        className="input"
        placeholder="Search notes…"
        aria-label="Search notes"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {visible.length === 0 ? (
        <p className="muted notes__empty">
          {notes.length === 0
            ? 'No notes yet — capture an idea, a meeting summary or a link.'
            : 'No notes match that search.'}
        </p>
      ) : (
        <ul className="note-list">
          {visible.map((note) => {
            const linkedTitle = taskTitle(note.taskId);
            return (
              <li key={note.id} className={`note note--${note.color}${note.pinned ? ' note--pinned' : ''}`}>
                <div className="note__head">
                  <h3 className="note__title">{note.title}</h3>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
                    aria-label={note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
                    title={note.pinned ? 'Unpin note' : 'Pin note'}
                  >
                    <IconPin width={16} height={16} />
                  </button>
                </div>

                {note.body ? <p className="note__body">{notePreview(note, 220)}</p> : null}

                <div className="note__meta">
                  {linkedTitle ? <span className="badge badge--muted">🔗 {linkedTitle}</span> : null}
                  <span className="note__time">{formatRelativeTime(note.updatedAt)}</span>
                </div>

                <div className="note__actions">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() =>
                      setDraft({
                        id: note.id,
                        title: note.title,
                        body: note.body,
                        color: note.color,
                        taskId: note.taskId ?? '',
                        pinned: note.pinned,
                      })
                    }
                  >
                    <IconEdit width={15} height={15} /> Edit
                  </button>
                  <button
                    type="button"
                    className="button button--ghost button--danger-text"
                    onClick={() => onDelete(note.id)}
                  >
                    <IconTrash width={15} height={15} /> Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {draft ? (
        <Modal
          title={draft.id ? 'Edit note' : 'New note'}
          onClose={() => setDraft(null)}
          footer={
            <>
              <span className="modal__footer-hint">Saved in this browser automatically.</span>
              <div className="modal__footer-right">
                <button type="button" className="button button--ghost" onClick={() => setDraft(null)}>
                  Cancel
                </button>
                <button type="button" className="button button--primary" onClick={saveDraft}>
                  {draft.id ? 'Save note' : 'Create note'}
                </button>
              </div>
            </>
          }
        >
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Title</span>
              <input
                className="input"
                autoFocus
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                aria-label="Note title"
              />
            </label>

            <label className="field">
              <span className="field__label">Body</span>
              <textarea
                className="input"
                rows={6}
                placeholder="Write anything — plain text is fine."
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                aria-label="Note body"
              />
            </label>

            <label className="field">
              <span className="field__label">Attach to task (optional)</span>
              <select
                className="input"
                value={draft.taskId}
                onChange={(event) => setDraft({ ...draft, taskId: event.target.value })}
                aria-label="Attach note to task"
              >
                <option value="">No task</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.done ? '[done] ' : ''}
                    {task.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="field">
              <span className="field__label">Colour</span>
              <div className="swatches">
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`swatch swatch--${color}${draft.color === color ? ' swatch--active' : ''}`}
                    onClick={() => setDraft({ ...draft, color })}
                    aria-label={`Use ${color} colour`}
                    aria-pressed={draft.color === color}
                  />
                ))}
              </div>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.pinned}
                onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })}
              />
              <span>Pin to the top of the notes list</span>
            </label>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
