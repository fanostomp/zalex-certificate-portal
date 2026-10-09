import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

test('emitted ESM function graph resolves and handles missing credentials before fetch', async t => {
  const root = resolve('.');
  const directory = await mkdtemp(join(root, 'node_modules/.tmp/function-packaging-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  // Use the nearest config Vercel selects for api/request-list.ts, not Vite's config.
  const configPath = ts.findConfigFile(join(root, 'api'), ts.sys.fileExists);
  const config = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys, onUnRecoverableConfigFileDiagnostic: diagnostic => { throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')); },
  });
  assert.ok(config);
  const program = ts.createProgram([join(root, 'api/request-list.ts'), join(root, 'api/request-certificate.ts')], {
    ...config.options, noEmit: false, noEmitOnError: true, incremental: false,
    tsBuildInfoFile: undefined, rootDir: root, outDir: directory,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')), []);
  assert.equal(program.emit().emitSkipped, false);
  let files = 0;
  async function inspect(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) await inspect(file);
      else if (entry.name.endsWith('.js')) {
        files++;
        const source = await readFile(file, 'utf8');
        for (const [, specifier] of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
          assert.equal(/\.tsx?$/.test(specifier), false, `Uncompiled import in ${entry.name}`);
          if (specifier.startsWith('.')) await readFile(resolve(path, specifier));
        }
      }
    }
  }
  await inspect(directory);
  assert.equal(files, 7, 'both entrypoints and every transitive application module are emitted');
  const previousKey = process.env.ZALEX_API_KEY;
  delete process.env.ZALEX_API_KEY;
  t.after(() => {
    if (previousKey !== undefined) process.env.ZALEX_API_KEY = previousKey;
  });
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected upstream request'); });
  for (const [entrypoint, method, expected] of [
    ['request-list', 'GET', 503], ['request-certificate', 'GET', 405], ['request-certificate', 'POST', 503],
  ]) {
    const { default: handler } = await import(pathToFileURL(join(directory, 'api', `${entrypoint}.js`)).href);
    const request = new Request(`http://localhost/api/${entrypoint}`, {
      method, ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address_to: 'Example Bank', purpose: `<p>${'a'.repeat(50)}</p>`, issued_on: '10/10/2099', employee_id: '00123' }) } : {}),
    });
    const response = await handler.fetch(request);
    assert.equal(response.status, expected);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});
