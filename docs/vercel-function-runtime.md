# Vercel function module resolution

The Node builder compiles traced TypeScript files into JavaScript. Previously,
`api/request-list.js` still imported `../server/certificateProxy.ts`, while the
package contained `server/certificateProxy.js`. Node ESM requires the exact
extension, so startup failed before the missing-key handler could return JSON.
The root solution tsconfig only referenced separate Vite/application configs;
it did not configure the compiler Vercel selects for the API entrypoints.

`api/tsconfig.json` is the nearest config selected for both Functions. It retains
the strict Node compiler settings and uses NodeNext with
`rewriteRelativeImportExtensions: true`. The compiler converts relative `.ts`
imports to `.js` throughout the transitive graph while the source imports remain
usable by Vite and Node's existing TypeScript tests. Vercel's file tracer follows
those imports and packages the compiled shared modules plus zod, parse5 and
entities. Adding raw `.ts` files with includeFiles would not correct the imports.
No additional runtime package, bundler or manual precompiled source is needed.

`npm test` includes a regression that emits the full function graph to temporary
JavaScript, checks relative imports resolve, and imports both handlers without a
configured key. Expected JSON statuses are GET list 503, GET certificate 405,
and POST certificate 503. Upstream fetch is blocked.

Verification also used the actual @vercel/node 23.0.0 build API locally for
Node.js 24.x. Both 230-file function packages loaded outside the repository,
without access to its node_modules, and passed the same missing-key checks.
This did not pull/link a Vercel project, configure credentials or deploy.
The normal Vite build and mocked browser checks still cover the SPA deep links;
the API-excluding rewrite and server-only environment configuration are unchanged.

A separately authorized protected Preview is still needed to confirm Vercel's
deployed wrapper, routing and Deployment Protection. Automatic Git deployment
for this branch stays disabled. Application authentication and distributed rate
limiting remain absent; do not expose an unrestricted public write proxy.

References: [TypeScript extension rewriting](https://www.typescriptlang.org/tsconfig/rewriteRelativeImportExtensions.html),
[Vercel Node builder](https://github.com/vercel/vercel/blob/main/packages/node/src/build.ts).
