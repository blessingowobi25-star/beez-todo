import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';

/** Integration tests for the whole shell: composer, filters, notes and undo. */
async function renderApp() {
  const user = userEvent.setup();
  render(<App />);
  return user;
}

describe('App', () => {
  it('shows the seeded task list on first load', async () => {
    await renderApp();
    expect(screen.getByRole('button', { name: 'Try TaskFlow: add your first task' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Welcome to TaskFlow/ })).toBeInTheDocument();
  });

  it('adds a task from the composer and persists it', async () => {
    const user = await renderApp();

    await user.type(screen.getByLabelText('Task title'), 'Write the submission form');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(screen.getByRole('button', { name: 'Write the submission form' })).toBeInTheDocument();
    expect(screen.getByLabelText('Task title')).toHaveValue('');
    expect(window.localStorage.getItem('taskflow:state')).toContain('Write the submission form');
  });

  it('completes a task and reflects it in the stats', async () => {
    const user = await renderApp();
    const title = 'Try TaskFlow: add your first task';

    await user.click(screen.getByLabelText(`Mark "${title}" as complete`));

    expect(screen.getByLabelText(`Mark "${title}" as incomplete`)).toBeChecked();
    expect(screen.getByRole('button', { name: /Clear completed/ })).toBeInTheDocument();
  });

  it('filters the list with the status tabs', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('tab', { name: /^Done/ }));

    expect(screen.getByRole('button', { name: 'Sketch the layout of the app' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try TaskFlow: add your first task' }),
    ).not.toBeInTheDocument();
  });

  it('searches tasks by text', async () => {
    const user = await renderApp();

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
    const title = 'Try TaskFlow: add your first task';

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
});
