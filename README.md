# Zalex Employee Certificate Portal

EY Junior React Front-end Developer assessment built with React, TypeScript, Vite, Tailwind CSS, React Router, React Hook Form, Zod and Tiptap.

**Public live demo:** [zalex-certificate-portal.vercel.app](https://zalex-certificate-portal.vercel.app)

The application integrates with the mock Zalex Assessment API through same-origin Vercel Functions. It loads certificate requests, filters and sorts them, and submits a validated certificate request without exposing the Zalex API credential to the browser.

Manual production smoke tests confirmed anonymous access, retrieval of nine mock certificate records, and a successful certificate submission returning `{"responce":"Ok"}` with the React success message. The mock backend does not guarantee that submissions persist or appear in a later GET.

## Localhost setup

Requires Node.js 22.12+ and npm. Use a modern browser with `Intl.Segmenter` support.

1. Run `npm ci` to install the locked dependencies.
2. Create `.env.local` in the project root with `ZALEX_API_KEY=<your-assessment-api-key>`. Obtain the value separately from the assessment materials. No credentials are committed to the repository.
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
| `npm run typecheck` | Check application, Vite configuration and server function types |
| `npm run lint` | Oxlint React/accessibility rules; warnings fail |
| `npm test` | Node built-in tests for server proxy, function module resolution, frontend API, dates, row identity, filters, sorting, HTML parsing and Unicode counting |
| `npm run build` | Typecheck and create production assets in `dist/` |
| `npm run preview` | Preview static assets only; API functions require Vercel Preview or npm run dev |

`npm test` needs no testing framework. Server HTML parsing cases use parse5 in Node; the same fixtures run separately against the real browser DOMParser to verify counting parity.

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

The browser scenarios intercept the exact same-origin API URLs and need no real key. Use a harmless placeholder for mocked server tests. Every GET/POST in the portal scenario is intercepted, using fixed records with duplicate references and identical records. It checks validation, Unicode counter agreement, formatting, mocked POST outcomes, loading/empty/error states, individual/combined filters, clearing, both sort directions, stable rows, keyboard interactions, accessibility attributes and responsive layouts. The Purpose scenario checks the same HTML/Unicode fixtures used by server tests, including malformed markup, entities, whitespace, combining characters and emoji. The portal scenario also checks the client-timezone header and computes test dates in the browser timezone. Neither scenario creates real certificates or relies on live record counts.

## Server-side API architecture

React calls `GET /api/request-list` and `POST /api/request-certificate` on its own origin. The two `api/*.ts` Vercel Node.js Functions use Web Request/Response handlers and delegate to `server/certificateProxy.ts`. Only the server appends `ZALEX_API_KEY` to the fixed Zalex Assessment API endpoint. There is no browser environment variable, injected secret, arbitrary proxy target, or separate frontend path for development.

`npm run dev` uses a Vite middleware proxy on **http://localhost:3000**, calling the same server implementation. Vite reads only the `ZALEX_` environment namespace on its Node side and exports only explicitly public `VITE_PUBLIC_*` variables to the client, excluding stale legacy secret names. Keep the key in ignored `.env.local` (or the server process environment); restart Vite after changes. If migrating an old checkout, rename the previous client-prefixed key variable to `ZALEX_API_KEY` and remove its old definition from all local env files. Never supply secrets through a `VITE_` variable or `define`. Historical browser builds may already have exposed the old key: request rotation before using it beyond the assessment.

The proxy permits only GET for the list and POST for creation; other methods return 405 with Allow. POST requires JSON and exactly the four existing fields. Actual streamed request size is limited to 32 KiB; address to 500 characters, employee ID to 100 digits, Purpose HTML to 24,000 characters, and the date must be a valid future M/D/YYYY calendar date. Payloads are forwarded with their values unchanged, including employee ID leading zeros and rich text. Both browser and server require at least 50 visible Purpose grapheme clusters and a future issue date. Server validation is not authentication or HTML sanitization. Nothing renders Purpose as executable HTML in the list.

Purpose validation uses the small server-only [parse5 HTML5 parser](https://parse5.js.org/) with scripting disabled, rather than a regex tag stripper or Node DOMParser. It parses an inert HTML document, reads body text, removes script/style/template subtrees, and treats br and block boundaries as whitespace. Both environments use the same pure Unicode counter (`src/utils/visibleText.ts`): entities are decoded, whitespace collapses, invisible-only content is excluded, NFC normalization and Intl.Segmenter count combining sequences/emoji as grapheme clusters. The browser helper's public exports and UI remain unchanged. Malformed markup follows HTML5 recovery, just as DOMParser does: recoverable formatted content with 50 visible characters is accepted; incomplete tags, comments and hidden/attribute text cannot inflate the count. This validates text length, not HTML safety.

The frontend sends its IANA timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone` in **X-Client-Timezone**, separate from the unchanged four-field Zalex API JSON payload. The development adapter preserves this header; the upstream request does not receive it. The server uses its own current instant, converts it to the supplied timezone with Intl.DateTimeFormat, and compares calendar YYYYMMDD values. Today and past dates are rejected, including around UTC midnight and daylight-saving transitions. Missing timezone defaults to UTC for non-browser callers; empty, invalid or oversized timezone values are rejected with 400. No client clock is trusted. Timezone is untrusted locale metadata, not authorization: a caller can select another valid zone and shift the day boundary. A fixed employer timezone would require an explicit business policy and corresponding frontend change. If midnight falls between form validation and server processing, the server's newer date is authoritative and may reject a formerly valid selection.

Upstream requests have a 10-second deadline covering fetch and response-body reading, redirects are disabled, and response bodies are limited to 1 MiB. GET records and the intentional `responce: "Ok"` POST contract are validated with shared Zod schemas; unknown upstream fields are stripped. Credential/endpoint reflection is rejected. Responses use `Cache-Control: no-store`. Missing server configuration returns 503; invalid payloads 400, oversized payloads 413, unsupported content types 415, malformed upstream success responses/network failures 502, timeouts 504. Upstream 401/403/429/500/502/503/504 statuses are preserved with a generic JSON error; other failures become 502. No upstream error bodies, URLs, payloads or stack traces are returned or logged. POST is never automatically retried: a timeout may occur after the mock accepted a request.

## Vercel deployment

Production is deployed at the public demo URL above. The Production API key, `ZALEX_API_KEY`, is configured through Vercel environment variables as Sensitive/Secret and is not stored in the repository. Local `.env.local` is not uploaded or used as Vercel configuration.

For a separate Vercel setup, select **Production Branch = main**, framework **Vite**, Node.js **22.x or 24.x**, build command `npm run build`, and output directory `dist`. Configure `ZALEX_API_KEY` through Vercel's server environment settings for the intended environment, using the privately supplied assessment credential. Never use a client-prefixed variable. Environment changes apply to subsequent deployments.

### Source-controlled configuration and security

- `vercel.json` declares the Vite build, the two root `api/*.ts` Functions with a 15-second maximum duration, and the SPA rewrite. `/api` is excluded from that rewrite; `/requests` and `/requests/new` resolve to `index.html`.
- `api/tsconfig.json` uses NodeNext and `rewriteRelativeImportExtensions` so server TypeScript imports compile to `.js` specifiers that resolve in Vercel's Node.js runtime.
- The server proxy enforces the payload, method, response, body-size and timeout controls described above. Vite exposes only the explicitly public environment namespace. Git ignores local env files.
- Automatic Git deployment is disabled in `vercel.json` for `feat/secure-vercel-api` and `docs/ey-assessment-finalization`. Other branches retain their existing deployment behavior.

### Dashboard-managed settings

Vercel Firewall is configured with a rate-limit rule of **5 requests per minute per IP**, using **Deny (403)**. This rule and the Production Sensitive/Secret environment variable are managed in Vercel's dashboard, separately from the repository. The complete Firewall configuration, route coverage, grouping and enforcement across aliases and Preview deployments have not been independently verified. Repository tests do not verify dashboard settings.

The Production demo is intentionally accessible anonymously. Deployment Protection for a separate Preview is a distinct dashboard setting: enable and verify it on every intended Preview URL/alias before using a real credential there. Production configuration does not establish Preview protection or supply a Preview key. A local Vite build does not certify deployed routing or dashboard access controls.

See official [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Deployment Protection](https://vercel.com/docs/deployment-protection), [environment variables](https://vercel.com/docs/environment-variables), [Firewall rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), and [Git deployment controls](https://vercel.com/docs/project-configuration/git-configuration).

## Security and deployment limitations

Both `GET /api/request-list` and `POST /api/request-certificate` are publicly reachable through the demo, including by callers outside the React UI. The Zalex API credential remains server-side, but callers need no application login or authorization to use these endpoints. The current GET data is mock assessment data; real employee information would require access controls. Public POST can consume quota and submit on the configured account's behalf.

The configured dashboard rate limit mitigates abuse when its rule matches, but it does not eliminate abuse or authenticate users. Callers can distribute traffic across IPs, and shared networks can cause legitimate reviewers to share a limit. Payload and timeout limits bound each invocation; they do not limit request frequency. The application implements neither authentication nor its own distributed rate limiter. Before handling real employee data or broadening this beyond an assessment demo, add authorization and review abuse controls. CORS, frontend validation and Origin checks cannot replace authentication.

Rotate the assessment credential before reusing it outside this demo, especially if it has been used in a legacy client-prefixed configuration or shared outside the intended secret store. Renaming an environment variable does not revoke an earlier exposed credential. Historical source used `VITE_ZALEX_API_KEY`; the current application does not. A clean source/history scan cannot establish that earlier browser builds, external copies or logs never exposed the credential.

Treat the mock responses as fixtures, not durable storage guarantees: successful POST does not guarantee a subsequent GET persists the request. Purpose HTML is submitted while list values are escaped text. The existing build chunk-size warning remains. Static `npm run preview` does not run serverless functions.

After `npm run build`, run `node scripts/verify-browser-bundle.mjs` to scan every production asset for locally configured credentials without displaying their values. Missing local credentials limits this check; also review the frontend for secret reads.
