import type { RefObject } from 'react';
import type { Priority, SortMode, TaskFilter, TaskStatusFilter } from '../types';
import { PRIORITY_LABELS, PRIORITY_VALUES } from '../lib/taskUtils';
import { IconSearch } from './icons';

interface FilterBarProps {
  filter: TaskFilter;
  sort: SortMode;
  tags: string[];
  counts: Record<TaskStatusFilter, number>;
  searchRef: RefObject<HTMLInputElement | null>;
  onFilterChange: (patch: Partial<TaskFilter>) => void;
  onSortChange: (sort: SortMode) => void;
  onReset: () => void;
}

const STATUS_TABS: { value: TaskStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Done' },
  { value: 'today', label: 'Today' },
  { value: 'overdue', label: 'Overdue' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'Manual order' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest first' },
  { value: 'alphabetical', label: 'A → Z' },
];

export function FilterBar({
  filter,
  sort,
  tags,
  counts,
  searchRef,
  onFilterChange,
  onSortChange,
  onReset,
}: FilterBarProps) {
  const isFiltered =
    filter.query.trim() !== '' ||
    filter.status !== 'all' ||
    filter.priority !== 'all' ||
    filter.tag !== 'all';

  return (
    <section className="filter-bar" aria-label="Search and filter tasks">
      <div className="filter-bar__search">
        <span className="filter-bar__search-icon" aria-hidden="true">
          <IconSearch width={17} height={17} />
        </span>
        <input
          ref={searchRef}
          type="search"
          className="input"
          placeholder="Search tasks and tags…  (press / to focus)"
          aria-label="Search tasks"
          value={filter.query}
          onChange={(event) => onFilterChange({ query: event.target.value })}
        />
      </div>

      <div className="tabs" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={filter.status === tab.value}
            className={`tab${filter.status === tab.value ? ' tab--active' : ''}`}
            onClick={() => onFilterChange({ status: tab.value })}
          >
            {tab.label}
            <span className="tab__count">{counts[tab.value]}</span>
          </button>
        ))}
      </div>

      <div className="filter-bar__selects">
        <label className="field field--inline">
          <span className="field__label">Priority</span>
          <select
            className="input"
            value={filter.priority}
            onChange={(event) =>
              onFilterChange({ priority: event.target.value as Priority | 'all' })
            }
          >
            <option value="all">Any</option>
            {PRIORITY_VALUES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--inline">
          <span className="field__label">Tag</span>
          <select
            className="input"
            value={filter.tag}
            onChange={(event) => onFilterChange({ tag: event.target.value })}
          >
            <option value="all">Any</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--inline">
          <span className="field__label">Sort</span>
          <select
            className="input"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortMode)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isFiltered ? (
          <button type="button" className="button button--ghost" onClick={onReset}>
            Clear filters
          </button>
        ) : null}
      </div>
    </section>
  );
}
