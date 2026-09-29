# Notedt

A small budget tracker: record income and expenses, see your savings, and get a
per-category breakdown of where your money goes. Data is stored in the
browser's `localStorage`. There is no backend or account.

## Features

- Add, edit, and delete transactions, with form validation
- Savings total plus income and expense totals
- Per-category breakdown for income and for expenses
- Search, plus filters by date range, type, and amount range
- Responsive layout: bottom tab bar and bottom-sheet dialogs on phones,
  sidebar on larger screens
- Transactions saved by pre-1.0 versions are migrated automatically on first load

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
  state/       Transactions store and toast notifications (React context)
  lib/         Pure logic: storage, totals, search/filter, formatting
  types/       Shared TypeScript types
```

## Deploying

The app is hosted on Vercel through its GitHub integration:

- Pushes to `master` deploy to production (https://react-notedt.vercel.app).
- Other branches and pull requests get preview deployments.

Build settings live in `vercel.json` (Vite preset, output in `dist/`, and a
rewrite to `index.html` so client-side routes like `/transactions` work on
refresh). To host elsewhere, run `npm run build`, serve `dist/` as a static
site, and add the same rewrite.
