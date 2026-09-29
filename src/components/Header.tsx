import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { AppState, ThemeName } from '../types';
import { downloadBackup, importState } from '../lib/persistence';

interface HeaderProps {
  theme: ThemeName;
  state: AppState;
  onToggleTheme: () => void;
  onReplaceState: (state: AppState) => void;
  onResetData: () => void;
  onLoadSample: () => void;
}

/** App shell header: branding, theme switch and the data (export/import/reset) menu. */
export function Header({
  theme,
  state,
  onToggleTheme,
  onReplaceState,
  onResetData,
  onLoadSample,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    downloadBackup(state, `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setMenuOpen(false);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      onReplaceState(importState(text));
      setError(null);
      setMenuOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import that file.');
    }
  }

  function handleReset() {
    if (window.confirm('Delete all tasks and notes from this browser? This cannot be undone.')) {
      onResetData();
      setMenuOpen(false);
    }
  }

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo" aria-hidden="true">
          ✓
        </span>
        <div>
          <h1 className="app-header__title">TaskFlow</h1>
          <p className="app-header__subtitle">To-do list · notes · focus timer</p>
        </div>
      </div>

      <div className="app-header__actions">
        <button
          type="button"
          className="button button--ghost"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title="Toggle theme (press D)"
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>

        <div className="menu">
          <button
            type="button"
            className="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            Data ▾
          </button>
          {menuOpen ? (
            <>
              <div
                className="menu__scrim"
                role="presentation"
                onClick={() => {
                  setMenuOpen(false);
                  setError(null);
                }}
              />
              <div className="menu__panel" role="menu">
                <button type="button" className="menu__item" role="menuitem" onClick={handleExport}>
                  ⬇️ Export backup (JSON)
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => fileInputRef.current?.click()}
                >
                  ⬆️ Import backup
                </button>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    onLoadSample();
                    setMenuOpen(false);
                  }}
                >
                  ✨ Load sample data
                </button>
                <button
                  type="button"
                  className="menu__item menu__item--danger"
                  role="menuitem"
                  onClick={handleReset}
                >
                  🗑️ Reset everything
                </button>
                {error ? <p className="menu__error">{error}</p> : null}
              </div>
            </>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={handleImport}
          />
        </div>
      </div>
    </header>
  );
}
