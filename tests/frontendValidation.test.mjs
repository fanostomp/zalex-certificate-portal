import assert from 'node:assert/strict';
import test from 'node:test';
import { createCertificateFormSchema, getCertificatePayloadByteLength, toApiPayload } from '../src/components/certificates/certificateFormValidation.ts';
import { getServerPurposeCharacterCount } from '../server/certificateValidation.ts';

// Exercise the real frontend schema with the existing HTML5 parser in Node.
// The browser scenarios exercise its default DOMParser implementation.
const schema = createCertificateFormSchema(getServerPurposeCharacterCount);
const values = { addressTo: 'Example Bank', employeeId: '00123', issuedOn: '2099-01-01', purpose: '<p>A sufficiently descriptive purpose for this certificate request.</p>' };
const parse = changes => schema.safeParse({ ...values, ...changes });

test('recipient accepts 500 characters and rejects 501 with an inline error', () => {
  assert.equal(parse({ addressTo: 'a'.repeat(500) }).success, true);
  const result = parse({ addressTo: 'a'.repeat(501) });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some(issue => issue.path[0] === 'addressTo' && issue.message.includes('500')));
});

test('recipient matches the server Zod code-point limit for astral Unicode letters', () => {
  const letter = String.fromCodePoint(0x10400);
  assert.equal(parse({ addressTo: letter.repeat(500) }).success, true);
  assert.equal(parse({ addressTo: letter.repeat(501) }).success, false);
});

test('employee ID accepts 100 digits and rejects 101 without losing leading zeros', () => {
  assert.equal(parse({ employeeId: '0'.repeat(100) }).data.employeeId, '0'.repeat(100));
  const result = parse({ employeeId: '1'.repeat(101) });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some(issue => issue.path[0] === 'employeeId' && issue.message.includes('100')));
});

test('Purpose limit includes HTML and accepts exactly 24000 code units', () => {
  assert.equal(parse({ purpose: `<p>${'a'.repeat(23993)}</p>` }).success, true);
  const result = parse({ purpose: `<p>${'a'.repeat(23994)}</p>` });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some(issue => issue.path[0] === 'purpose' && issue.message.includes('24,000')));
});

test('Purpose length uses UTF-16 code units rather than grapheme count', () => {
  const result = parse({ purpose: `<p>${'😀'.repeat(12000)}</p>` });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some(issue => issue.path[0] === 'purpose' && issue.message.includes('24,000')));
});

test('recipient NFC normalization treats composed and decomposed names equally', () => {
  const composed = parse({ addressTo: 'Café' });
  const decomposed = parse({ addressTo: ' Cafe\u0301 ' });
  assert.equal(composed.success, true);
  assert.equal(decomposed.success, true);
  assert.equal(decomposed.data.addressTo, composed.data.addressTo);
  assert.equal(toApiPayload(decomposed.data).address_to, 'Café');
});

test('recipient normalization happens before the server length limit is checked', () => {
  const result = parse({ addressTo: 'e\u0301'.repeat(500) });
  assert.equal(result.success, true);
  assert.equal(result.data.addressTo, 'é'.repeat(500));
});

test('NFC normalization preserves the existing recipient and employee validation rules', () => {
  for (const addressTo of ['', '   ', 'Bank!', '<script>', '\u0301']) assert.equal(parse({ addressTo }).success, false);
  for (const employeeId of ['', 'ABC', '12 34', '12.3']) assert.equal(parse({ employeeId }).success, false);
});

test('payload byte count matches serialized UTF-8 JSON including escaping', () => {
  const payload = toApiPayload({ ...values, purpose: '<p>é😀\\"\n</p>' });
  assert.equal(getCertificatePayloadByteLength(payload), Buffer.byteLength(JSON.stringify(payload), 'utf8'));
  assert.ok(getCertificatePayloadByteLength(payload) > JSON.stringify(payload).length);
});

for (const bytes of [32767, 32768, 32769]) {
  test(`serialized multibyte request at ${bytes} bytes ${bytes <= 32768 ? 'passes' : 'fails'}`, () => {
    const prefix = 'é'.repeat(10000);
    const base = { ...values, purpose: `<p>${prefix}</p>` };
    const size = Buffer.byteLength(JSON.stringify(toApiPayload(base)), 'utf8');
    const purpose = `<p>${prefix}${'a'.repeat(bytes - size)}</p>`;
    assert.ok(purpose.length <= 24000);
    assert.equal(Buffer.byteLength(JSON.stringify(toApiPayload({ ...values, purpose })), 'utf8'), bytes);
    const result = parse({ purpose });
    assert.equal(result.success, bytes <= 32768);
    if (!result.success) assert.ok(result.error.issues.some(issue => issue.path[0] === 'purpose' && issue.message.includes('32 KiB')));
  });
}

test('multibyte text under the HTML length limit can exceed the request byte limit', () => {
  const purpose = `<p>${'😀'.repeat(9000)}</p>`;
  assert.ok(purpose.length < 24000);
  const result = parse({ purpose });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some(issue => issue.message.includes('32 KiB')));
});

test('Purpose still requires 50 visible graphemes regardless of markup', () => {
  assert.equal(parse({ purpose: `<p><strong>${'a'.repeat(49)}</strong></p>` }).success, false);
  assert.equal(parse({ purpose: `<p>${'e\u0301'.repeat(50)}</p>` }).success, true);
  assert.equal(parse({ purpose: `<p>${'\u200b'.repeat(100)}</p>` }).success, false);
});
