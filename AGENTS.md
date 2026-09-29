# AGENTS.md — persistent instructions for AI agents working in this repo

This file is the contract between the human maintainer and any AI coding agent
(Cline, Codex, Claude Code, Gemini, Copilot, …) that edits this project.
Read it fully before writing code. If you learn something that would have saved you
a step, add it to "Lessons learned" at the bottom — that is how this file improves.

## 1. Project overview

- **Product:** TaskFlow — a browser-only to-do app with notes, due dates, priorities,
  tags, drag-and-drop ordering, a customisable focus timer, stats, JSON backup/restore and a
  light/dark theme. The UI follows a soft "planner" reference: greeting hero, week strip,
  pastel cards and a mobile bottom nav (`src/planner.css`).
- **Stack:** React 19 + TypeScript (strict) + Vite, hand-written CSS (no CSS framework),
  Vitest + Testing Library for tests.
- **Persistence:** `localStorage` only. There is **no backend and no network calls**.
  Never introduce a server, database, auth or third-party API without explicit instruction.
- **Deployment:** static build (`dist/`) on Vercel (Netlify config is kept as a fallback).

## 2. Commands

| Goal | Command |
| --- | --- |
| Install | `npm install` |
| Dev server | `npm run dev` (http://localhost:5173) |
| Type check | `npm run typecheck` |
| Unit + component tests | `npm test` (Vitest, run once) |
| Watch tests | `npm run test:watch` |
| Production build | `npm run build` (runs `tsc --noEmit` first, then Vite) |
| Preview the build | `npm run preview` |

**Definition of done for every change:** `npm run typecheck` → `npm test` → `npm run build`
all pass, and the app still works in the browser at both desktop width and ~380px.

## 3. Project structure rules

```
src/
  main.tsx            entry point only (mount + CSS import)
  App.tsx             layout + composition + keyboard shortcuts. No business logic.
  types.ts            all domain types (Task, Note, AppState, …)
  index.css           the single stylesheet, kept in labelled sections
  lib/                pure, dependency-free logic (no React imports, easy to unit test)
    date.ts           calendar/ISO date helpers
    id.ts             createId()
    noteUtils.ts      note factories, search, sorting
    persistence.ts    localStorage + backup import/export + theme bootstrap
    schema.ts         validation, migrations, seed data, defaults
    taskUtils.ts      filters, sorting, stats, tag parsing
  state/appReducer.ts pure reducer: every state transition lives here
  hooks/              React glue (useAppState store, useFocusTimer)
  components/         one component per file, PascalCase, named exports
  tests/              Vitest specs mirroring the lib/state modules by name
```

Rules:

1. Put logic in `src/lib` or `src/state` first, then wire it into components. Components
   should be thin; if a component grows past ~250 lines, extract a child component.
2. `src/lib/**` must stay pure: no React imports, no DOM access except in
   `persistence.ts`, and inputs like "today" or "now" must be injectable parameters.
3. Only `persistence.ts` may touch `localStorage`. Components and hooks call the store.
4. Never mutate state in place. Reducers and utils return new objects/arrays.
5. New persisted fields require: a type in `types.ts`, a default in `schema.ts`
   (`parseTask`/`parseNote`/`parseState`), a `migrate()` rule when older data exists,
   and a bump of `SCHEMA_VERSION`.

## 4. Coding conventions

- TypeScript strict mode is on, plus `noUnusedLocals`, `noUnusedParameters` and
  `verbatimModuleSyntax`. Use `import type { … }` for type-only imports.
- Never use `any`. Model unknown data as `unknown` and narrow it (see `schema.ts`).
- Prefer `interface` for object shapes, `type` for unions. Export component props
  interfaces next to the component.
- Small, named functions with an explicit return type on every exported function.
- Comments explain **why**, not what. Add a short JSDoc line to every exported helper.
- Handle every error path: `try/catch` with a comment describing the degradation
  (for example "storage blocked → continue in memory").
- Keep imports ordered: external packages, then `../types`, then `../lib`, then `./`.
- No `console.log` in committed code; no dead code or commented-out blocks.

## 5. Naming conventions

- Components: `PascalCase.tsx`, named export (`export function TaskItem`).
- Hooks: `useThing.ts` in `src/hooks`.
- Reducer actions: `domain/verb` strings — `task/add`, `note/update`, `filter/reset`.
- Booleans read as questions/flags: `isOverdue`, `canDrag`, `isDropTarget`, `hasTasks`.
- Handlers: `handleX` inside a component, `onX` for props.
- CSS classes follow a BEM-ish shape using the component name as the block:
  `card`, `task__title`, `task--done`. State modifiers are always `--modifier`.
- Test files: `<module>.test.ts(x)` in `src/tests`, `describe` named after the module.

## 6. Testing requirements

- **Every pure helper and reducer branch needs a test.** Any new function in `src/lib`
  or `src/state` ships with a matching spec in `src/tests/<module>.test.ts`.
- Bugs get a failing test first, then the fix (the modal focus bug below was found this way).
- Test levels used here:
  1. **Unit** — `lib/*`, `state/appReducer` with injected dates (`new Date('2026-09-29T09:00:00.000Z')`).
  2. **Integration** — `src/tests/App.test.tsx` drives the real UI with
     `@testing-library/user-event` (add task, complete, filter, search, note creation,
     delete + undo, theme/shortcut).
- Rules for tests:
  - Query by role/label, never by CSS class or `container.querySelector`.
  - Never depend on "today" being the real today: pass fixed dates into pure functions.
  - `src/tests/setup.ts` clears the DOM and `localStorage` after each test — keep it that way
    so persistence never leaks between cases.
  - Prefer `findBy*`/`waitFor` for anything asynchronous; no arbitrary `setTimeout`s.
- Run `npm test` before declaring work complete. A change that leaves a test red is not done.

## 7. State management rules

- All transitions go through `appReducer` (`src/state/appReducer.ts`). UI calls store
  actions exposed by `useAppState`; no `setState` on domain data inside components.
- Reducers must be pure. Time comes from the action's optional `at` field
  (`at ?? new Date().toISOString()`) so tests can pin timestamps.
- Deleting a task must not delete its notes: the notes survive and are unlinked.
- Anything persisted must survive a round trip through `parseState` (validate → migrate).

## 8. Styling conventions

- One stylesheet (`src/index.css`) organised by the numbered sections in its header.
- Colour, radius, shadow and spacing values come from CSS custom properties on
  `:root` / `html[data-theme='…']`. **Never hard-code a hex colour in a component**;
  add a token instead. Both themes must define every new token.
- Inline `style` is only allowed for dynamic geometry (for example a progress-bar width).
- Keyboard focus must stay visible: rely on the shared `:focus-visible` ring.
- Keep the layout responsive: verify desktop (≈1280px) and narrow (≈380px).

## 9. Accessibility requirements

- Interactive icons need an accessible name: either visible text or `aria-label`
  (`aria-label={`Mark "${task.title}" as complete`}`).
- Announce transient feedback with `role="status"`; dialogs use `role="dialog"`,
  `aria-modal="true"` and an `aria-label`.
- The app must be fully keyboard operable: `/` search, `n` new task, `d` theme, `Escape` closes dialogs.
- Never trap or steal focus: dialogs focus once on open and do not re-focus on re-render.

## 10. Validation checklist before you report work as complete

1. `npm run typecheck` — zero errors.
2. `npm test` — all specs green.
3. `npm run build` — succeeds, `dist/` produced.
4. Manual smoke test in `npm run dev`: create a task, complete it, edit it (dialog typing
   must keep focus), delete it and hit Undo, create a note and attach it to a task,
   run the focus timer for a few seconds, toggle the theme, export a backup.
5. Check the browser console for React warnings (keys, controlled inputs).
6. Confirm `localStorage` still parses old data (or bump `SCHEMA_VERSION` and migrate).

## 11. Deployment rules

- Deploys are static: `dist/` is the artefact. `vercel.json` and `netlify.toml` keep the
  SPA rewrite (`/*` → `/index.html`) so deep links never 404.
- Never commit secrets, tokens or `.env` files. `.tools/` and `node_modules/` stay untracked.
- Deploy only a build that passed the checklist in section 10, and record the live URL
  in the README after deploying.

## 12. Lessons learned (read this before you debug)

These are real problems hit while building this app. They are the highest-value part of this file.

1. **`useEffect` with a function prop in its dependency array re-runs on every render.**
   `Modal` originally did `useEffect(..., [onClose])`. Because `onClose={() => setX(null)}` is a
   new function each render, the effect re-ran after every keystroke and called
   `panel.focus()`, so typing in the dialog only kept the first character. Fix: keep the
   callback in a ref and use an empty dependency array. The integration test
   "creates a note from the notes panel" catches this class of bug — keep it.
2. **Dates must be local, never UTC.** `new Date('2026-09-29').toISOString()` shifts the day
   for users east/west of UTC. Always build dates from `getFullYear/getMonth/getDate`
   (`toISODate`) and compare calendar days, not timestamps. `lib/date.ts` exists for this.
3. **Validate everything that comes out of `localStorage` or a backup file.** A schema change
   or hand-edited JSON must not white-screen the app: `parseState` drops bad records,
   `loadState` falls back to seed data, and `importState` surfaces a readable message.
4. **Do not delete linked data implicitly.** Deleting a task unlinks its notes instead of
   removing them; users rarely expect cascading deletes in a notes app.
5. **Assign a stable accessible name to repeated controls.** `getAllByTitle('Delete task')`
   works only because each row is otherwise indistinguishable; when adding row actions,
   prefer a label that includes the row title.
6. **Keep logic out of components.** Every rule that needed a test (filters, sorting, stats,
   reducer branches) was trivially testable once it lived in `lib/` or `state/`. Logic that
   started inside JSX had to be extracted before it could be verified.
7. **Split large files up front.** Files above ~250 lines or edits above ~6 kB per tool call
   get unwieldy; the repo is organised so each module fits in one edit.
8. **Environment note (this machine).** There was no Node on `PATH`. A portable Node build was
   downloaded to `C:\Users\bless\.local-node` and prepended to `PATH`; long tasks
   (`npm install`, `npm test`, `npm run build`) were run as detached processes writing to a log
   because the shell kills commands after 30 s. If `node` is missing, check that folder first.
9. **PowerShell `Start-Process -ArgumentList` does not quote paths.** Pass one pre-quoted
   string (`'-NoProfile -File "C:\path with spaces\script.ps1"'`) or the script silently
   fails to launch.
10. **Native date/time inputs need an explicit `color-scheme`.** The browser renders
    `input[type=date]` segments (day/month/year) using the *OS* scheme, so a light-themed app
    viewed on a dark-mode machine showed a barely visible picker and a white calendar glyph.
    Fix lives in `index.css`: `color-scheme: light` on the input, overridden to `dark` under
    `html[data-theme='dark']`, plus `filter: invert(1)` on `::-webkit-calendar-picker-indicator`.
    Keep that block when adding new form controls.
11. **Emoji are not icons.** Buttons now use the inline SVG set in `components/icons.tsx`
    (`stroke="currentColor"`, `aria-hidden`), so they inherit the text colour and stay legible in
    both themes. `Button`/`IconButton` CSS reserves `flex: none` for `svg` — keep it, or the
    glyphs stretch inside flex rows. Never hard-code an emoji in a control again.
12. **Theme tokens live in `:root`, but a per-theme value can override them.** `--card-pink`
    etc. are defined once in `:root` because the pastel card colours are theme-independent.
    Anything that genuinely differs per theme stays in the `html[data-theme='…']` blocks.
13. **Long-running commands must be detached.** The terminal kills foreground commands after
    ~30 s, so `npm test` / `npm run build` are launched with `Start-Process … verify.ps1 -Only <task>`
    and the result is read from `.tools/verify-run.log`. Definition of done is unchanged:
    `typecheck` → `test` → `build` all exit 0.
14. **A richer UI can make integration tests time out, not fail.** After adding the hero, week
    strip and bottom nav, two `App.test.tsx` cases hit Vitest's 5 s default purely on volume
    (`userEvent` types character by character through a much bigger DOM). If a test times out but
    the assertion never ran, raise `testTimeout` in `vite.config.ts` (now 20 s) instead of
    rewriting the test. Only change the test if an actual assertion failed.
15. **Delete orphan CSS files — and re-check imports after deleting one.** An earlier
    `src/theme-overrides.css` was superseded by `planner.css`; it was removed, but a stale
    `import './theme-overrides.css'` in `main.tsx` briefly broke the build with
    `UNRESOLVED_IMPORT` while typecheck stayed green. When a file is unimported it is dead code
    (section 4), and after deleting any module, grep for its name in the import graph.
16. **Run the verification detached, through `.tools/bg.ps1`.** Long tasks must survive the
    30 s terminal limit. `.tools/bg.ps1 -Script all -Log full.log` starts `verify.ps1` via
    `Start-Process` (properly quoted, per lesson 9) and writes the result to `.tools/<log>`.
    Poll the log with `read_files` — do **not** chain a `Start-Sleep` into the same terminal,
    because the next foreground command kills the run you are waiting for.
17. **Query conditionally-rendered fields with `findBy*`.** The focus timer's custom
    hours/minutes inputs only exist after the "Custom" chip is pressed, so `getByLabelText`
    raced the re-render and failed. Use `findByLabelText`/`findByText` for anything behind a
    toggle, per section 6 of the testing rules.

Add to this document whenever an agent:
- discovers a repo-specific gotcha (put it in "Lessons learned" with the symptom and the fix),
- establishes a new convention worth repeating,
- finds a command that reliably validates work.

Keep it factual, specific and short. Prefer examples over prose, and never document a rule
the codebase itself does not follow — update the code or delete the rule instead.


