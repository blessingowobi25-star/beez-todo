import { useCallback, useEffect, useRef, useState } from 'react';

export const FOCUS_PRESETS = [15, 25, 50] as const;
export const DEFAULT_FOCUS_MINUTES = 25;

export interface FocusTimerApi {
  minutes: number;
  remaining: number;
  running: boolean;
  completedSessions: number;
  progress: number;
  setMinutes: (minutes: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
}

/**
 * Countdown timer for focus sessions.
 * `onSessionComplete` fires once each time the clock reaches zero, which is what
 * increments the focus-session counter on a task.
 */
export function useFocusTimer(onSessionComplete: () => void): FocusTimerApi {
  const [minutes, setMinutesState] = useState<number>(DEFAULT_FOCUS_MINUTES);
  const [remaining, setRemaining] = useState<number>(DEFAULT_FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const onCompleteRef = useRef(onSessionComplete);
  onCompleteRef.current = onSessionComplete;

  useEffect(() => {
    if (!running) return undefined;

    const interval = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!running || remaining > 0) return;
    setRunning(false);
    setCompletedSessions((count) => count + 1);
    onCompleteRef.current();
  }, [remaining, running]);

  const setMinutes = useCallback((next: number) => {
    const safe = Math.max(1, Math.round(next));
    setMinutesState(safe);
    setRunning(false);
    setRemaining(safe * 60);
  }, []);

  return {
    minutes,
    remaining,
    running,
    completedSessions,
    progress: minutes > 0 ? 1 - remaining / (minutes * 60) : 0,
    setMinutes,
    start: useCallback(() => setRunning(true), []),
    pause: useCallback(() => setRunning(false), []),
    reset: useCallback(() => {
      setRunning(false);
      setRemaining(minutes * 60);
    }, [minutes]),
    skip: useCallback(() => {
      setRunning(false);
      setRemaining(minutes * 60);
    }, [minutes]),
  };
}
