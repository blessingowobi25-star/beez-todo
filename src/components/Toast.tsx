import { IconClose } from './icons';

interface ToastProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}

/** Transient notification with a single action (used for undo). */
export function Toast({ message, actionLabel, onAction, onDismiss }: ToastProps) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__message">{message}</span>
      <button type="button" className="button button--ghost" onClick={onAction}>
        {actionLabel}
      </button>
      <button type="button" className="icon-button" onClick={onDismiss} aria-label="Dismiss notification">
        <IconClose width={15} height={15} />
      </button>
    </div>
  );
}
