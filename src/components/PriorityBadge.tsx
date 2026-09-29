import type { Priority } from '../types';
import { PRIORITY_LABELS } from '../lib/taskUtils';

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={`badge badge--priority badge--${priority}`} title={`${PRIORITY_LABELS[priority]} priority`}>
      <span aria-hidden="true" className="badge__dot" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
