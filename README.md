# KMHHomepage

Ken M. Haggerty Public Homepage — built with [Astro](https://astro.build) and TypeScript
(with the React integration configured so future components can be written in React).

## Commands

| Command                | Action                                       |
| ---------------------- | -------------------------------------------- |
| `npm install`          | Install dependencies                         |
| `npm run dev`          | Start the dev server at `localhost:4321`     |
| `npm run build`        | Build the static site to `dist/`             |
| `npm run preview`      | Preview the production build                 |
| `npm test`             | Run the unit test suite (Vitest)             |
| `npm run coverage`     | Run tests with coverage thresholds           |
| `npm run lint`         | Lint with ESLint                             |
| `npm run format`       | Format with Prettier                         |
| `npm run format:check` | Check formatting without writing             |
| `npm run check`        | Type-check `.astro`/`.ts` with `astro check` |

## Content model

The site is data-driven:

- `site-info.json` — site title, favicon filename, and footer text.
- `case-studies/*.json` — one file per case study; each generates a page at
  `/work/<key>/` and a panel on the Work page. Filter flags (`zero_to_one`,
  `consumer`, `gov_dod`, `mobile`) drive the filter chips.
- `src/data/about.json` — the About Me copy and avatar filename.
- `public/images/` — image assets referenced by filename from the JSON files.

To add a case study, drop a new JSON file in `case-studies/` (same shape as
`gfm.json`) and its images in `public/images/`.

### Placeholder assets to replace

- `public/images/avatar.png` — replace with the real About Me headshot
  (rendered at 64×64, a 128×128 square works well).
- `public/favicon.png` — replace with the real favicon.

## Layout modes

The design has two content layouts: desktop and mobile. Small screens always
get the mobile layout; on larger screens the toolbar toggle (top right)
switches between the desktop layout and a 420px mobile preview, persisted in
`localStorage`. The mode is tracked on `<html data-viewport="...">` and all
mode-specific styling keys off that attribute in `src/styles/global.css`.
