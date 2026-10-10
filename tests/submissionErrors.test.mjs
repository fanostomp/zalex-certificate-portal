import assert from 'node:assert/strict';
import test from 'node:test';
import * as api from '../src/api/CertificateApi.ts';

const payload = { address_to: 'Example Bank', purpose: '<p>A sufficiently descriptive certificate purpose for this request.</p>', issued_on: '1/1/2099', employee_id: '00123' };

for (const [status, unknown, message] of [
  [400, false, /validate|validation/i],
  [413, false, /too large/i],
  [429, false, /too many|wait/i],
  [504, true, /may have been processed.*verify.*before submitting again/i],
  [502, true, /may have been processed.*verify.*before submitting again/i],
]) {
  test(`POST ${status} preserves status and ${unknown ? 'ambiguous' : 'rejected'} outcome without retry`, async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Do not reflect arbitrary server text' }, { status }));
    const error = await api.createCertificateRequest(payload).catch(error => error);
    assert.equal(error.name, 'CertificateApiError');
    assert.equal(error.status, status);
    assert.equal(error.outcomeUnknown, unknown);
    assert.match(api.getSubmissionErrorMessage(error), message);
    assert.doesNotMatch(api.getSubmissionErrorMessage(error), /arbitrary server text/);
    assert.equal(globalThis.fetch.mock.callCount(), 1);
  });
}

test('POST network failure preserves an unknown outcome without retrying or leaking details', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('private transport details'); });
  const error = await api.createCertificateRequest(payload).catch(error => error);
  assert.equal(error.status, null);
  assert.equal(error.outcomeUnknown, true);
  assert.match(api.getSubmissionErrorMessage(error), /may have been processed.*verify.*before submitting again/i);
  assert.doesNotMatch(api.getSubmissionErrorMessage(error), /private transport details/);
  assert.equal(globalThis.fetch.mock.callCount(), 1);
});

for (const response of ['malformed JSON', { responce: 'Unexpected' }]) {
  test(`POST ${typeof response === 'string' ? 'malformed JSON' : 'unexpected success contract'} does not claim a known outcome`, async t => {
    t.mock.method(globalThis, 'fetch', async () => typeof response === 'string' ? new Response(response) : Response.json(response));
    const error = await api.createCertificateRequest(payload).catch(error => error);
    assert.equal(error.status, 200);
    assert.equal(error.outcomeUnknown, true);
    assert.match(api.getSubmissionErrorMessage(error), /may have been processed.*verify/i);
    assert.equal(globalThis.fetch.mock.callCount(), 1);
  });
}

test('GET abort retains its cancellation signal and never retries', async t => {
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, 'fetch', async (_url, options) => { assert.equal(options.signal, controller.signal); throw controller.signal.reason; });
  await assert.rejects(api.getCertificateRequests(controller.signal), { name: 'AbortError' });
  assert.equal(globalThis.fetch.mock.callCount(), 1);
});
