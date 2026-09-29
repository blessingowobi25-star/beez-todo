# TaskFlow — To-Do list, notes & focus timer

A small, fast to-do app built **almost entirely through AI-assisted coding** for the HNG
"Build and Deploy a To-Do List App Using AI" task. No backend, no accounts: everything is
stored in the browser and works offline after the first load.

## Live app

- **Live URL:** _add the deployed URL here (for example `https://taskflow-xyz.vercel.app`)_
- **Source:** this repository (the same code was used to produce `dist/`)

## Features

**Core — tasks**
- Create tasks with title, description, priority (high/medium/low), due date and tags.
- Complete, edit, and delete tasks, with an **Undo** toast for deletes (task at its original position).
- Drag-and-drop reordering (Manual order) plus sorting by due date, priority, newest or A→Z.
- Search across titles, descriptions and tags; filter by status (All / Active / Done / Today / Overdue),
  priority and tag; tag chips filter with one click.
- Overdue / due-today highlighting and counts.

**Notes**
- Free-standing notes with a title, body, colour and pin-to-top.
- Notes can be **attached to a task**; a task's editor lists its notes and lets you add more.
- A task row shows how many notes are linked; the Notes panel has its own search.

**Extra features (beyond tasks + notes)**
1. **Pomodoro focus timer** (15/25/50 min) that logs each finished session against the
   selected task, so you can see where your time went.
2. **Progress dashboard** — completion %, active, due today, overdue and total focus sessions.
3. **JSON backup** — export/import your whole workspace, plus "load sample data" and "reset".
4. **Light/dark theme**, keyboard shortcuts (`/`, `n`, `d`, `Esc`) and a responsive layout.

## Tech stack

| Concern | Choice |
| --- | --- |
| UI | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Styling | Hand-written CSS with design tokens (no UI framework) |
| State | `useReducer` store, pure reducer, `localStorage` persistence |
| Tests | Vitest + Testing Library (jsdom) — 47 specs |
| Hosting | Vercel static build (Netlify config included as a fallback) |

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run typecheck    # tsc --noEmit
npm test             # Vitest, single run
npm run test:watch   # watch mode
npm run build        # typecheck + production build into dist/
npm run preview      # serve the built output locally
```

## Deploying (free tier)

The build output in `dist/` is a static site, so any static host works.

**Vercel — CLI**

```bash
npm i -g vercel      # or: npx vercel
vercel login         # interactive, one time
vercel --prod        # builds and deploys, prints the live URL
```

**Vercel — dashboard (no CLI)**

1. Push this repo to GitHub, then "Add New → Project" and import it (Vercel detects Vite).
2. Or drag the locally built `dist/` folder onto <https://vercel.com/new>.

**Netlify (fallback)**

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

`vercel.json` and `netlify.toml` already contain the SPA rewrite and build settings.

## Data & privacy

All data stays in `localStorage` under the `taskflow:state` key. Nothing is uploaded anywhere;
the focus timer and stats are computed locally. Use **Data → Export backup** for a JSON copy,
and **Data → Reset everything** to clear the browser.

## Project layout

```
src/
  App.tsx            layout, composition, keyboard shortcuts
  types.ts           domain types (Task, Note, AppState, …)
  index.css          design tokens + component styles (light & dark)
  lib/               pure logic: date, taskUtils, noteUtils, schema, persistence, id
  state/appReducer.ts pure state transitions
  hooks/             useAppState (store) and useFocusTimer
  components/        Header, StatsBar, TaskComposer, FilterBar, TaskList, TaskItem,
                     TaskEditor, NotesPanel, FocusTimer, Modal, Toast, PriorityBadge
  tests/             Vitest specs
AGENTS.md            instructions for AI agents working in this codebase
```

## Notes on how this was built

The task asked for the app to be built primarily through AI interaction, so the repo keeps
the AI's working rules in [`AGENTS.md`](./AGENTS.md) — coding/naming conventions, testing
requirements, project-structure rules, validation checklist and a "lessons learned" section
that was updated as real bugs were found (for example the dialog focus bug that the
integration test caught). That file is the deliverable for the advanced part of the task and
is also genuinely used: validation steps and conventions there match the code as shipped.
