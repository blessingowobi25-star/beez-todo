import { useState } from 'react';
import type { Note, Priority, Task } from '../types';
import { notePreview } from '../lib/noteUtils';
import { PRIORITY_LABELS, PRIORITY_VALUES, parseTags, type TaskDraft } from '../lib/taskUtils';
import { Modal } from './Modal';

interface TaskEditorProps {
  task: Task;
  notes: Note[];
  onSave: (draft: TaskDraft) => void;
  onClose: () => void;
  onDelete: () => void;
  onAddNote: (title: string, body: string) => void;
  onDeleteNote: (id: string) => void;
}

/** Modal editor for a single task, including its linked notes. */
export function TaskEditor({
  task,
  notes,
  onSave,
  onClose,
  onDelete,
  onAddNote,
  onDeleteNote,
}: TaskEditorProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [tags, setTags] = useState(task.tags.join(', '));
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave({
      title: trimmed,
      description,
      priority,
      dueDate: dueDate || null,
      tags: parseTags(tags),
    });
    onClose();
  }

  return (
    <Modal
      title="Edit task"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="button button--danger"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            Delete task
          </button>
          <div className="modal__footer-right">
            <button type="button" className="button button--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="button button--primary" onClick={handleSubmit}>
              Save changes
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
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Task title"
          />
        </label>

        <label className="field">
          <span className="field__label">Description</span>
          <textarea
            className="input"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-label="Task description"
          />
        </label>

        <div className="form-grid__row">
          <label className="field">
            <span className="field__label">Priority</span>
            <select
              className="input"
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
            >
              {PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Due date</span>
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Tags (comma separated)</span>
          <input
            className="input"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            aria-label="Task tags"
          />
        </label>
      </div>

      <section className="editor-notes">
        <h3 className="subsection-title">
          Notes {task.focusSessions > 0 ? <span className="badge badge--muted">🎯 {task.focusSessions} sessions</span> : null}
        </h3>
        <p className="muted">Notes attached to this task. They also appear in the Notes panel.</p>

        {notes.length > 0 ? (
          <ul className="linked-notes">
            {notes.map((note) => (
              <li key={note.id} className="linked-note">
                <div>
                  <p className="linked-note__title">{note.title}</p>
                  <p className="linked-note__preview">{notePreview(note, 90)}</p>
                </div>
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={() => onDeleteNote(note.id)}
                  aria-label={`Delete note ${note.title}`}
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No notes attached yet.</p>
        )}

        <div className="linked-note-form">
          <input
            className="input"
            placeholder="Note title"
            aria-label="New note title"
            value={noteTitle}
            onChange={(event) => setNoteTitle(event.target.value)}
          />
          <textarea
            className="input"
            rows={2}
            placeholder="Note body"
            aria-label="New note body"
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
          />
          <button
            type="button"
            className="button"
            disabled={!noteTitle.trim() && !noteBody.trim()}
            onClick={() => {
              onAddNote(noteTitle, noteBody);
              setNoteTitle('');
              setNoteBody('');
            }}
          >
            Add note
          </button>
        </div>
      </section>
    </Modal>
  );
}
