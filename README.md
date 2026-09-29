# Notedt

A small budget tracker: record income and expenses, see your savings, and get a
per-category breakdown of where your money goes. Data is stored in the
browser's `localStorage`. There is no backend or account.

## Features

- **Transactions:** add, edit, and delete with validation, with Undo after a delete
- **Monthly overview:** income, expenses, and net for any month, compared
  with the previous month, plus a per-category breakdown
- **Budgets:** monthly limits per expense category, with progress and
  over-budget warnings
- **Recurring transactions:** monthly items such as rent, bills, or salary
  are added automatically on their day; rules can be paused or edited
- **Custom categories** alongside the built-in ones
- **Search and filters** by date range, type, and amount
- **Backup and restore** (JSON), CSV export for spreadsheets, and CSV import
- **Installable and offline-ready** (PWA)
- **Light, dark, or system theme**
- **Responsive layout:** bottom tab bar and bottom-sheet dialogs on phones,
  sidebar on larger screens
- Data from older versions is migrated automatically on first load

## Getting started

Requires Node 22.22+ and npm 11+ (see `.nvmrc`).

```sh
npm install
npm run dev
```

## Scripts

| Script               | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Start the Vite dev server                   |
| `npm run build`      | Type-check and build to `dist/`             |
| `npm run preview`    | Serve the production build locally          |
| `npm test`           | Run the test suite once (Vitest)            |
| `npm run test:watch` | Run tests in watch mode                     |
| `npm run lint`       | Lint with ESLint                            |
| `npm run typecheck`  | Type-check with `tsc`                       |
| `npm run format`     | Format with Prettier (`format:check` in CI) |

## Project structure

```
src/
  components/  UI building blocks (layout, modals, navigation, forms)
  pages/       Route screens: Overview and Transactions
  state/       App data store, toasts, and theme (React context)
  lib/         Pure logic: storage, data updates, recurring rules, totals,
               budgets, CSV, search/filter, formatting
e2e/           Playwright end-to-end tests
  types/       Shared TypeScript types
```

## Data and privacy

Everything is stored in the browser's `localStorage` under `notedt:data`
(the theme preference is under `notedt:theme`). Nothing is sent to a server.
Use **Settings → Your data** to export a backup.

## Deploying

The app is hosted on Vercel through its GitHub integration:

- Pushes to `main` deploy to production (https://react-notedt.vercel.app).
- Other branches and pull requests get preview deployments.

Build settings live in `vercel.json` (Vite preset, output in `dist/`, and a
rewrite to `index.html` so client-side routes like `/transactions` work on
refresh). To host elsewhere, run `npm run build`, serve `dist/` as a static
site, and add the same rewrite.
