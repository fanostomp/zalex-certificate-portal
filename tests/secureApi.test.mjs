import assert from 'node:assert/strict';
import test from 'node:test';
import list from '../api/request-list.ts';
import create from '../api/request-certificate.ts';
import { createCertificateRequest, getCertificateRequests } from '../src/api/CertificateApi.ts';

const payload = { address_to: 'Example Bank', purpose: '<p>A valid purpose for an employee certificate request.</p>', issued_on: '10/10/2030', employee_id: '00123' };
const records = [{ reference_no: 50, address_to: 'Example Bank', purpose: 'Example', issued_on: '6/16/2023', status: 'Pending' }];
const request = (method = 'POST', body = JSON.stringify(payload), headers = {}) => new Request('http://localhost/api/request-certificate', {
  method, ...(method === 'GET' || method === 'HEAD' ? {} : { body }), headers: { 'Content-Type': 'application/json', ...headers },
});
const json = (value, status = 200) => Response.json(value, { status });

test('secure server and frontend contracts', async (t) => {
  t.mock.method(globalThis, 'fetch');
  const previousKey = process.env.ZALEX_API_KEY;
  t.after(() => {
    if (previousKey === undefined) delete process.env.ZALEX_API_KEY;
    else process.env.ZALEX_API_KEY = previousKey;
  });
  process.env.ZALEX_API_KEY = 'server-only-test-secret';
  const fetch = globalThis.fetch;
  await t.test('GET validates records and only appends the server credential upstream', async () => {
    fetch.mock.mockImplementation(async (url, options) => {
      assert.equal(new URL(url).pathname, '/request-list');
      assert.equal(new URL(url).searchParams.get('subscription-key'), 'server-only-test-secret');
      assert.equal(options.redirect, 'error');
      return json(records);
    });
    const response = await list.fetch(request('GET'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), records);
  });
  await t.test('POST preserves payload, leading zeros and responce spelling', async () => {
    fetch.mock.mockImplementation(async (_url, options) => {
      assert.deepEqual(JSON.parse(options.body), payload);
      return json({ responce: 'Ok', internal: 'must not escape' });
    });
    const response = await create.fetch(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { responce: 'Ok' });
  });
  await t.test('POST enforces 50 visible Unicode characters without counting markup', async () => {
    fetch.mock.mockImplementation(async () => json({ responce: 'Ok' }));
    for (const purpose of [
      `<p>${'a'.repeat(49)}</p>`,
      `<p>${'\u200b'.repeat(100)}</p>`,
      `<p>${'e\u0301'.repeat(49)}</p>`,
      `<p>${'👨‍👩‍👧‍👦'.repeat(49)}</p>`,
      `<script>${'a'.repeat(100)}</script><style>${'b'.repeat(100)}</style><template>${'c'.repeat(100)}</template><p>Short</p>`,
      `<p title="${'a'.repeat(100)}"><strong>Short`,
    ]) {
      const before = fetch.mock.callCount();
      assert.equal((await create.fetch(request('POST', JSON.stringify({ ...payload, purpose })))).status, 400);
      assert.equal(fetch.mock.callCount(), before);
    }
    for (const purpose of [
      `<p><strong>${'a'.repeat(25)}</strong><em>${'b'.repeat(25)}</em></p>`,
      `<p>${'e\u0301'.repeat(50)}</p>`,
      `<p>${'👨‍👩‍👧‍👦'.repeat(50)}</p>`,
      `<p>${'&amp;'.repeat(50)}</p>`,
      `<p><strong>${'a'.repeat(50)}`, // HTML5 recovery matches DOMParser.
    ]) {
      const before = fetch.mock.callCount();
      assert.equal((await create.fetch(request('POST', JSON.stringify({ ...payload, purpose })))).status, 200);
      assert.equal(JSON.parse(fetch.mock.calls[before].arguments[1].body).purpose, purpose);
    }
  });
  await t.test('POST future dates follow client timezone across UTC midnight and DST', async () => {
    t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-09T00:30:00Z') });
    fetch.mock.mockImplementation(async () => json({ responce: 'Ok' }));
    try {
      for (const [date, zone, status] of [
        ['10/8/2026', 'UTC', 400], ['10/9/2026', 'UTC', 400], ['10/10/2026', 'UTC', 200],
        ['2/30/2027', 'UTC', 400], ['2/29/2027', 'UTC', 400], ['2/29/2028', 'UTC', 200],
        ['10/8/2026', 'America/Los_Angeles', 400], ['10/9/2026', 'America/Los_Angeles', 200],
        ['10/9/2026', 'Europe/Athens', 400], ['10/10/2026', 'Europe/Athens', 200],
        ['10/10/2026', 'Invalid/Zone', 400], ['10/10/2026', '', 400],
      ]) {
        const before = fetch.mock.callCount();
        assert.equal((await create.fetch(request('POST', JSON.stringify({ ...payload, issued_on: date }), { 'X-Client-Timezone': zone }))).status, status, `${date} ${zone}`);
        assert.equal(fetch.mock.callCount() - before, status === 200 ? 1 : 0);
      }
      assert.equal((await create.fetch(request('POST', JSON.stringify({ ...payload, issued_on: '10/9/2026' })))).status, 400, 'missing timezone uses UTC');
      t.mock.timers.setTime(Date.parse('2026-10-09T23:30:00Z'));
      assert.equal((await create.fetch(request('POST', JSON.stringify({ ...payload, issued_on: '10/10/2026' }), { 'X-Client-Timezone': 'Europe/Athens' }))).status, 400);
      assert.equal((await create.fetch(request('POST', JSON.stringify({ ...payload, issued_on: '10/11/2026' }), { 'X-Client-Timezone': 'Europe/Athens' }))).status, 200);
      t.mock.timers.setTime(Date.parse('2026-03-29T00:30:00Z'));
      assert.equal((await create.fetch(request('POST', JSON.stringify({ ...payload, issued_on: '3/29/2026' }), { 'X-Client-Timezone': 'Europe/Athens' }))).status, 400);
      assert.equal((await create.fetch(request('POST', JSON.stringify({ ...payload, issued_on: '3/30/2026' }), { 'X-Client-Timezone': 'Europe/Athens' }))).status, 200);
    } finally { t.mock.timers.reset(); }
  });
  for (const status of [401, 403, 500]) {
    await t.test(`upstream ${status} has a safe body for both endpoints`, async () => {
      fetch.mock.mockImplementation(async () => new Response('https://zalexinc.azure-api.net/?subscription-key=server-only-test-secret', { status }));
      for (const [handler, req] of [[list, request('GET')], [create, request()]]) {
        const response = await handler.fetch(req);
        assert.equal(response.status, status);
        assert.deepEqual(await response.json(), { error: 'Certificate service request failed' });
      }
    });
  }
  await t.test('missing key never invokes upstream', async () => {
    process.env.ZALEX_API_KEY = '';
    const before = fetch.mock.callCount();
    assert.equal((await list.fetch(request('GET'))).status, 503);
    assert.equal((await create.fetch(request())).status, 503);
    assert.equal(fetch.mock.callCount(), before);
    process.env.ZALEX_API_KEY = 'server-only-test-secret';
  });
  await t.test('unsupported methods rejected before fetch', async () => {
    const before = fetch.mock.callCount();
    for (const method of ['HEAD', 'OPTIONS', 'PUT', 'DELETE', 'PATCH']) {
      for (const handler of [list, create]) {
        const response = await handler.fetch(request(method));
        assert.equal(response.status, 405);
        assert.ok(response.headers.get('allow'));
      }
    }
    assert.equal((await list.fetch(request())).status, 405);
    assert.equal((await create.fetch(request('GET'))).status, 405);
    assert.equal(fetch.mock.callCount(), before);
  });
  await t.test('invalid, malformed and oversized payloads never reach upstream', async () => {
    const before = fetch.mock.callCount();
    for (const value of [{}, { ...payload, employee_id: 'abc' }, { ...payload, issued_on: '2/30/2030' }, { ...payload, purpose: '' }, { ...payload, address_to: '<script>' }, { ...payload, extra: true }]) {
      assert.equal((await create.fetch(request('POST', JSON.stringify(value)))).status, 400);
    }
    assert.equal((await create.fetch(request('POST', '{'))).status, 400);
    assert.equal((await create.fetch(request('POST', 'x'.repeat(32769)))).status, 413);
    assert.equal((await create.fetch(request('POST', JSON.stringify(payload), { 'Content-Length': '32769' }))).status, 413);
    assert.equal((await create.fetch(request('POST', JSON.stringify(payload), { 'Content-Type': 'text/plain' }))).status, 415);
    assert.equal(fetch.mock.callCount(), before);
  });
  await t.test('unexpected upstream JSON, invalid dates and reflected secrets are rejected', async () => {
    for (const handler of [list, create]) {
      for (const response of [new Response('not json'), json({ responce: 'Error' }), json([{ ...records[0], issued_on: 'bad' }]), json([{ ...records[0], purpose: 'server-only-test-secret' }]), json([{ ...records[0], purpose: 'https://zalexinc.azure-api.net/request-list' }])]) {
        fetch.mock.mockImplementation(async () => response);
        assert.equal((await handler.fetch(request(handler === list ? 'GET' : 'POST'))).status, 502);
      }
    }
  });
  await t.test('network failures and redirects expose no internal details', async () => {
    fetch.mock.mockImplementation(async () => { throw new Error('secret upstream URL'); });
    for (const handler of [list, create]) {
      const response = await handler.fetch(request(handler === list ? 'GET' : 'POST'));
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), { error: 'Certificate service unavailable' });
    }
    fetch.mock.mockImplementation(async () => new Response(null, { status: 302, headers: { location: 'https://example.com' } }));
    assert.equal((await list.fetch(request('GET'))).status, 502);
  });
  await t.test('upstream response byte limit includes streamed bodies', async () => {
    fetch.mock.mockImplementation(async () => new Response('x'.repeat(1024 * 1024 + 1)));
    assert.equal((await list.fetch(request('GET'))).status, 502);
    fetch.mock.mockImplementation(async () => new Response('[]', { headers: { 'content-length': String(1024 * 1024 + 1) } }));
    assert.equal((await list.fetch(request('GET'))).status, 502);
  });
  await t.test('upstream timeout returns 504 and aborts fetch', async () => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    fetch.mock.mockImplementation(async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    }));
    for (const handler of [list, create]) {
      const pending = handler.fetch(request(handler === list ? 'GET' : 'POST'));
      // POST performs asynchronous bounded body reading before starting fetch.
      for (let i = 0; i < 20; i++) await Promise.resolve();
      t.mock.timers.tick(10001);
      assert.equal((await pending).status, 504);
    }
    t.mock.timers.reset();
  });
  await t.test('frontend uses same-origin endpoints and preserves abort signal', async () => {
    const controller = new AbortController();
    fetch.mock.mockImplementation(async (url, options) => {
      assert.equal(url, '/api/request-list');
      assert.equal(options.signal, controller.signal);
      return json(records);
    });
    assert.deepEqual(await getCertificateRequests(controller.signal), records);
    fetch.mock.mockImplementation(async (url, options) => {
      assert.equal(url, '/api/request-certificate');
      assert.deepEqual(JSON.parse(options.body), payload);
      assert.equal(options.headers['X-Client-Timezone'], Intl.DateTimeFormat().resolvedOptions().timeZone);
      return json({ responce: 'Ok' });
    });
    assert.deepEqual(await createCertificateRequest(payload), { responce: 'Ok' });
  });
  await t.test('frontend rejects HTTP errors and unexpected responses', async () => {
    for (const status of [401, 403, 500]) {
      fetch.mock.mockImplementation(async () => json({}, status));
      await assert.rejects(getCertificateRequests(), new RegExp(String(status)));
      await assert.rejects(createCertificateRequest(payload), new RegExp(String(status)));
    }
    fetch.mock.mockImplementation(async () => json({ response: 'Ok' }));
    await assert.rejects(createCertificateRequest(payload));
    await assert.rejects(getCertificateRequests());
  });
});
