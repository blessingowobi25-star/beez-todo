import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { todayISO } from '../lib/date';

/** Integration tests for the whole shell: composer, filters, notes and undo. */
async function renderApp() {
  const user = userEvent.setup();
  render(<App />);
  return user;
}

/** Adds tasks through the real composer so tests never seed localStorage by hand. */
async function addTask(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.type(screen.getByLabelText('Task title'), title);
  await user.click(screen.getByRole('button', { name: 'Add task' }));
}

describe('App', () => {
  it('starts empty for a new user but shows the welcome note', async () => {
    await renderApp();

    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryByText('Deploy checklist')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Welcome to Beez' })).toBeInTheDocument();
  });

  it('brands itself as Beez with no feature-list subtitle', async () => {
    await renderApp();

    expect(screen.getByRole('heading', { level: 1, name: 'Beez' })).toBeInTheDocument();
    expect(screen.queryByText(/to-do list · notes · focus timer/i)).not.toBeInTheDocument();
  });

  it('adds a task from the composer and persists it', async () => {
    const user = await renderApp();

    await addTask(user, 'Write the submission form');

    expect(screen.getByRole('button', { name: 'Write the submission form' })).toBeInTheDocument();
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Task title')).toHaveValue('');
    expect(window.localStorage.getItem('beeztodo:state')).toContain('Write the submission form');
  });

  // Regression: adding a task while a status tab was active left the new task
  // filtered out of the list, so the app looked like it had swallowed it.
  it('shows a new task even when a status filter was already active', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('tab', { name: /^Done/ }));
    await addTask(user, 'Visible after filtering');

    expect(screen.getByRole('button', { name: 'Visible after filtering' })).toBeInTheDocument();
  });

  it('completes a task and reflects it in the stats', async () => {
    const user = await renderApp();
    const title = 'Write the submission form';
    await addTask(user, title);

    await user.click(screen.getByLabelText(`Mark "${title}" as complete`));

    expect(screen.getByLabelText(`Mark "${title}" as incomplete`)).toBeChecked();
    expect(screen.getByRole('button', { name: /Clear completed/ })).toBeInTheDocument();
  });

  it('filters the list with the status tabs', async () => {
    const user = await renderApp();
    await addTask(user, 'Still open');
    await addTask(user, 'Already finished');

    await user.click(screen.getByLabelText('Mark "Already finished" as complete'));
    await user.click(screen.getByRole('tab', { name: /^Done/ }));

    expect(screen.getByRole('button', { name: 'Already finished' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Still open' })).not.toBeInTheDocument();
  });

  // Regression: a lingering day filter swallowed stat-tile taps, so "1 active"
  // and "1 overdue" appeared to do nothing.
  it('shows the matching tasks when a stat tile is tapped', async () => {
    const user = await renderApp();
    await addTask(user, 'Overdue item');

    await user.click(screen.getByRole('button', { name: 'Edit Overdue item' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Due date'), '2020-01-01');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await user.click(screen.getByRole('button', { name: 'Show 1 overdue tasks' }));

    expect(screen.getByRole('button', { name: 'Overdue item' })).toBeInTheDocument();
  });

  it('searches tasks by text', async () => {
    const user = await renderApp();
    await addTask(user, 'Run a 25 minute focus session');
    await addTask(user, 'Capture an idea in the Notes panel');

    await user.type(screen.getByLabelText('Search tasks'), 'focus');

    expect(screen.getByRole('button', { name: 'Run a 25 minute focus session' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Capture an idea in the Notes panel' }),
    ).not.toBeInTheDocument();
  });

  it('creates a note from the notes panel', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'New note' }));
    const dialog = await screen.findByRole('dialog', { name: /New note/i });

    await user.type(within(dialog).getByLabelText('Note title'), 'Interview talking points');
    await user.type(within(dialog).getByLabelText('Note body'), 'Talk about how agents.md shaped the build.');
    await user.click(within(dialog).getByRole('button', { name: 'Create note' }));

    expect(await screen.findByRole('heading', { name: 'Interview talking points' })).toBeInTheDocument();
  });

  it('deletes a task and restores it with undo', async () => {
    const user = await renderApp();
    const title = 'Write the submission form';
    await addTask(user, title);

    await user.click(screen.getAllByTitle('Delete task')[0]);

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('Deleted');
    expect(screen.queryByRole('button', { name: title })).not.toBeInTheDocument();

    await user.click(within(toast).getByRole('button', { name: 'Undo' }));

    expect(await screen.findByRole('button', { name: title })).toBeInTheDocument();
  });

  it('toggles the theme and focuses search with the "/" shortcut', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.keyboard('/');
    expect(screen.getByLabelText('Search tasks')).toHaveFocus();
  });

  it('sets a custom focus duration from hours and minutes', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Custom' }));

    // The panel is conditional markup, so wait for it rather than assuming it is there.
    const hoursInput = await screen.findByLabelText('Custom hours');
    const minutesInput = await screen.findByLabelText('Custom minutes');
    await user.clear(hoursInput);
    await user.type(hoursInput, '1');
    await user.clear(minutesInput);
    await user.type(minutesInput, '30');
    await user.click(screen.getByRole('button', { name: 'Set' }));

    expect(await screen.findByText('1:30:00')).toBeInTheDocument();
  });

  it('filters the list to a day picked in the calendar', async () => {
    const user = await renderApp();
    await addTask(user, 'Run a 25 minute focus session');

    await user.click(screen.getByRole('gridcell', { name: /, today/ }));

    expect(screen.getByText(/Showing tasks due/)).toBeInTheDocument();
  });

  it('pages forward and back through months', async () => {
    const user = await renderApp();
    const monthName = (offset: number) =>
      new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1).toLocaleDateString(
        undefined,
        { month: 'long' },
      );

    expect(screen.getByRole('grid', { name: new RegExp(monthName(0)) })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByRole('grid', { name: new RegExp(monthName(1)) })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(await screen.findByRole('grid', { name: new RegExp(monthName(-1)) })).toBeInTheDocument();
  });

  it('shows a full month of square cells with today marked', async () => {
    await renderApp();

    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
    expect(screen.getByRole('gridcell', { name: /, today/ })).toBeInTheDocument();
  });

  it('captions the composer date readably', async () => {
    const user = await renderApp();

    // No caption while the picker is empty; a readable one ("Today", "Sep 29, 2026")
    // once a date is chosen, instead of bare dd/mm/yyyy numbers.
    expect(screen.queryByText('No date')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Due date')).toHaveValue(todayISO());
  });
});
