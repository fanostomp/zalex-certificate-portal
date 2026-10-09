import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import test from 'node:test';
import { createServer } from 'vite';
import { certificateDevProxy } from '../server/viteCertificateProxy.ts';

function call(port, path, method = 'GET', body, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: 'localhost', port, path, method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers } }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, text }));
    });
    request.on('error', reject);
    request.end(body);
  });
}

test('real Vite middleware proxies only approved routes using mocked upstream', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).searchParams.size, 1);
    assert.equal(new URL(url).searchParams.get('subscription-key'), 'local-server-only-secret');
    assert.equal(options.headers['X-Client-Timezone'], undefined, 'client timezone is not forwarded upstream');
    return Response.json(options.method === 'GET' ? [] : { responce: 'Ok' });
  });
  const server = await createServer({ configFile: false, logLevel: 'silent',
    plugins: [certificateDevProxy('local-server-only-secret')], server: { host: 'localhost', port: 0 } });
  await server.listen();
  t.after(() => server.close());
  const port = server.httpServer.address().port;
  assert.deepEqual(await call(port, '/api/request-list?target=https://example.com&subscription-key=client'), { status: 200, text: '[]' });
  const payload = { address_to: 'Example Bank', purpose: '<p>A sufficiently descriptive purpose for this certificate request.</p>', issued_on: '10/10/2030', employee_id: '00123' };
  assert.deepEqual(await call(port, '/api/request-certificate', 'POST', JSON.stringify(payload)), { status: 200, text: '{"responce":"Ok"}' });
  const before = globalThis.fetch.mock.callCount();
  assert.equal((await call(port, '/api/request-certificate', 'POST', JSON.stringify(payload), { 'X-Client-Timezone': 'Invalid/Zone' })).status, 400);
  assert.equal((await call(port, '/api/arbitrary-target')).status, 404);
  assert.equal((await call(port, '/api/request-list/extra')).status, 404);
  assert.equal((await call(port, '/api/request-list', 'POST', '{}')).status, 405);
  assert.equal((await call(port, '/api/request-certificate', 'POST', 'x'.repeat(32769))).status, 413);
  assert.equal(globalThis.fetch.mock.callCount(), before);
});
