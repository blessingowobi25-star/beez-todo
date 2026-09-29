import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Task } from '../types';
import { formatClock } from '../lib/date';
import { FOCUS_PRESETS, MAX_FOCUS_MINUTES, MIN_FOCUS_MINUTES, clampFocusMinutes, useFocusTimer } from '../hooks/useFocusTimer';
import { IconClock, IconPause, IconPlay, IconTarget } from './icons';

interface FocusTimerProps {
  tasks: Task[];
  selectedTaskId: string | null;
  today: string;
  onSelectTask: (taskId: string | null) => void;
  onSessionComplete: (taskId: string) => void;
}

/** Extra feature: a focus timer with presets plus a fully custom duration. */
export function FocusTimer({
  tasks,
  selectedTaskId,
  today,
  onSelectTask,
  onSessionComplete,
}: FocusTimerProps) {
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const timer = useFocusTimer(() => {
    if (selectedTask) onSessionComplete(selectedTask.id);
  });

  const openTasks = tasks.filter((task) => !task.done);
  const sessionsOnSelected = selectedTask ? selectedTask.focusSessions : 0;
  const [customOpen, setCustomOpen] = useState(false);
  const [hoursInput, setHoursInput] = useState('0');
  const [minutesInput, setMinutesInput] = useState('25');
  const [customError, setCustomError] = useState<string | null>(null);

  function handleCustomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hours = Number(hoursInput);
    const minutes = Number(minutesInput);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || minutes < 0) {
      setCustomError('Enter hours and minutes as positive numbers.');
      return;
    }
    const total = Math.round(hours * 60 + minutes);
    if (total < MIN_FOCUS_MINUTES || total > MAX_FOCUS_MINUTES) {
      setCustomError(`Choose between ${MIN_FOCUS_MINUTES} minute and ${MAX_FOCUS_MINUTES / 60} hours.`);
      return;
    }
    timer.setMinutes(clampFocusMinutes(total));
    setCustomError(null);
    setCustomOpen(false);
  }

  return (
    <section className="focus card" aria-label="Focus timer">
      <header className="focus__header">
        <h2 className="card__title">
          <IconTarget width={20} height={20} /> Focus timer
        </h2>
        <span className="badge badge--muted">Custom ready</span>
      </header>

      <label className="field">
        <span className="field__label">Working on</span>
        <select
          className="input"
          value={selectedTaskId ?? ''}
          onChange={(event) => onSelectTask(event.target.value || null)}
          aria-label="Task to focus on"
        >
          <option value="">No specific task</option>
          {openTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </label>

      <div className="focus__clock" aria-live="off">
        <span className="focus__time">{formatClock(timer.remaining)}</span>
        <span className="focus__state">{timer.running ? 'Focusing…' : 'Paused'}</span>
      </div>

      <div className="progress" role="progressbar" aria-valuenow={Math.round(timer.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress__bar" style={{ width: `${Math.round(timer.progress * 100)}%` }} />
      </div>

      <div className="chip-row" role="group" aria-label="Preset durations">
        {FOCUS_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`chip${timer.minutes === preset ? ' chip--active' : ''}`}
            onClick={() => {
              timer.setMinutes(preset);
              setCustomError(null);
            }}
            aria-pressed={timer.minutes === preset}
          >
            <IconClock width={14} height={14} /> {preset} min
          </button>
        ))}
        <button
          type="button"
          className={`chip${customOpen ? ' chip--active' : ''}`}
          onClick={() => setCustomOpen((open) => !open)}
          aria-expanded={customOpen}
        >
          Custom
        </button>
      </div>

      {customOpen ? (
        <form className="focus__custom" onSubmit={handleCustomSubmit}>
          <div className="focus__custom-row">
            <label className="field">
              <span className="field__label">Hours</span>
              <input
                type="number"
                className="input"
                min={0}
                max={8}
                step={1}
                inputMode="numeric"
                value={hoursInput}
                onChange={(event) => setHoursInput(event.target.value)}
                aria-label="Custom hours"
              />
            </label>
            <label className="field">
              <span className="field__label">Minutes</span>
              <input
                type="number"
                className="input"
                min={0}
                max={480}
                step={1}
                inputMode="numeric"
                value={minutesInput}
                onChange={(event) => setMinutesInput(event.target.value)}
                aria-label="Custom minutes"
              />
            </label>
            <button type="submit" className="button button--primary">
              Set
            </button>
          </div>
          <p className="muted">{customError ?? `Any length from ${MIN_FOCUS_MINUTES} minute to ${MAX_FOCUS_MINUTES / 60} hours.`}</p>
        </form>
      ) : null}

      <div className="focus__controls">
        {timer.running ? (
          <button type="button" className="button button--primary" onClick={timer.pause}>
            <IconPause width={16} height={16} /> Pause
          </button>
        ) : (
          <button type="button" className="button button--primary" onClick={timer.start}>
            <IconPlay width={16} height={16} /> {timer.remaining === timer.minutes * 60 ? 'Start' : 'Resume'}
          </button>
        )}
        <button type="button" className="button" onClick={timer.reset}>
          Reset
        </button>
      </div>

      <dl className="focus__stats">
        <div>
          <dt>Sessions finished (this visit)</dt>
          <dd>{timer.completedSessions}</dd>
        </div>
        <div>
          <dt>Sessions logged on this task</dt>
          <dd>{sessionsOnSelected}</dd>
        </div>
        <div>
          <dt>Today</dt>
          <dd>{today}</dd>
        </div>
      </dl>

      <p className="muted focus__hint">
        Each completed session adds one focus credit to the task, so you can see where your time went.
      </p>
    </section>
  );
}
