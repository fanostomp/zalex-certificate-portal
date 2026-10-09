# Zalex Employee Certificate Portal

Frontend-only EY Junior React Front-end Developer assessment built with React, TypeScript, Vite, Tailwind CSS, React Router, React Hook Form, Zod and Tiptap.

## Start from a clean checkout

Requires Node.js 22.12+ and npm. Use a modern browser with `Intl.Segmenter` support.

1. Run `npm ci` to install the locked dependencies.
2. Create `.env.local` in the project root with `VITE_ZALEX_API_KEY=<your-assessment-api-key>`. Obtain the value separately from the assessment materials. No credential is included in the source release.
3. Run `npm run dev` and open **http://localhost:3000**.

The development server uses localhost port 3000 with `strictPort`; it fails if the port is occupied. Restart it after environment changes. Missing credentials produce the application's API error feedback.

## Implemented behavior

- Required recipient containing letters, numbers and whitespace; required digits-only employee ID, preserving leading zeros; real calendar issue date strictly after the user's local current date.
- Rich-text Purpose with Bold/Italic, inline errors, validation focus and a shared live counter/validation helper. Minimum 50 visible grapheme clusters: decomposed accents and compound emoji count as one each. HTML entities are decoded; whitespace is trimmed and collapsed, with a single internal separator counting as one. Invisible/control/format-only input and standalone combining marks contribute nothing. Joiners and emoji tags are retained only to preserve grapheme segmentation. Counting is not HTML sanitization.
- POST loading, success and failure feedback. All inputs and editor controls lock during submission. Success preserves values; editing clears feedback. Success requires HTTP success and the mock's intentionally spelled `responce: "Ok"`.
- GET loading, empty and error states with runtime response validation. Invalid response records reject the list rather than being silently dropped.
- **Reference No. filter:** exact string matching after trimming the query (`5` does not match `50`; `050` does not match `50`).
- **Address to filter:** case-insensitive substring matching for every whitespace-separated search word, in any order.
- **Status filter:** exact selected status; options come from the full loaded dataset.
- Filters combine with AND. **Clear filters** restores all records while keeping the selected sort. The count displays `matching of total requests`.
- **Issued on sort:** chronological, initially descending; clicking toggles direction. **Status sort:** alphabetical English comparison ignoring case, initially ascending when selected. One sort field is active at a time. Equal values retain fetched order.
- Responsive navigation/form, horizontally scrollable table with keyboard-operable scroll buttons, labeled filters, keyboard-operable sort buttons, `aria-sort`, validation announcements and route focus management.

## Dates and duplicate references

API dates use `M/D/YYYY`; padded and unpadded month/day are accepted. Impossible dates and invalid leap days are rejected. Comparison uses numeric `YYYYMMDD`, avoiding timezone conversion; POST converts the validated date to the same API format. The table preserves the API's date text and supplies an ISO `time` attribute.

The mock has no unique backend ID and may return duplicate reference numbers or completely identical records. Each fetched record receives a UUID once. Sorting/filtering preserve row objects and IDs without mutating the dataset or removing duplicates. IDs are regenerated on refetch/remount and are not persistent business identifiers.

## Verification commands

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check application and Vite configuration types |
| `npm run lint` | Oxlint React/accessibility rules; warnings fail |
| `npm test` | Node built-in tests for dates, row identity, filters, sorting and Unicode counting |
| `npm run build` | Typecheck and create production assets in `dist/` |
| `npm run preview` | Preview the build; default preview origin is not the API/CORS target |

`npm test` needs no testing framework. HTML parsing cases use a real browser separately because Node has no native DOMParser.

### Browser scenarios

With the Vite dev server running, call `tests/portal.browser.cjs` and `tests/purpose.browser.cjs` using a Playwright `Page` supplied by external browser tooling. Playwright is not a project dependency; `npm test` does not execute these scenarios. In a Node harness that already has Playwright installed, use the following (paths are relative to this project root):

```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/requests/new');
    console.log(await require('./tests/purpose.browser.cjs')(page));
    console.log(await require('./tests/portal.browser.cjs')(page));
  } finally {
    await browser.close();
  }
})().catch(() => { console.error('Browser verification failed'); process.exitCode = 1; });
```

Use an assessment key or a harmless placeholder in `.env.local` for mocked browser testing; the API functions still require a nonempty value before fetch. Every GET/POST in the portal scenario is intercepted, using fixed records with duplicate references and identical records. It checks validation, Unicode counter agreement, formatting, mocked POST outcomes, loading/empty/error states, individual/combined filters, clearing, both sort directions, stable rows, keyboard interactions, accessibility attributes and responsive layouts. The Purpose scenario checks real DOM parsing, entities, whitespace, combining characters and emoji. Neither scenario creates real certificates or relies on live record counts.

## Mock API and deployment limitations

The assessment requires a frontend API key in the query string. `VITE_` values are embedded in the browser bundle and visible to browser users. Ignoring `.env.local` does not make the key confidential; failed browser requests can also put credential-bearing URLs in console logs. This is an assessment mock, not a production credential architecture. Do not publish logs, screenshots or compiled assets as source submission artifacts.

Treat mock responses as fixtures, not durable storage guarantees; a successful POST is not proof that a subsequent GET persists the request. Purpose HTML is submitted, while table values are rendered as escaped text. If GET returns Purpose markup, the table displays it literally rather than executing it.

The known build chunk-size warning remains. Deployment testing must separately verify the real host's API CORS policy, build-time environment configuration and SPA fallback to `index.html` for `/requests` and `/requests/new`. Local Vite routing and mocked POST tests do not certify those production behaviors. No backend is included.

## Safe source release (PowerShell)

Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-release.ps1` from the project root. `Bypass` applies only to this process, without changing the machine's saved execution policy. It creates **release/zalex-certificate-portal.zip** from an explicit file allowlist containing source, configuration, README and tests. It checks for locally configured API keys without printing them, then reopens the ZIP and verifies every entry and its content.

The script excludes `.env.local`, other env files, `node_modules`, `dist`, browser artifacts, screenshots, logs and temporary output. It leaves `.env.local` untouched and refuses to overwrite an existing release ZIP. If local configuration is absent, credential comparison cannot identify an unknown credential: review source before packaging. Update the allowlist when adding necessary files.

Use only the newly verified ZIP for submission. Any older ZIP produced by recursively archiving the workspace may contain credentials and should not be submitted. `.gitignore` does not control ZIP contents. No commit, push or deployment is performed by the packaging script.
