import assert from 'node:assert/strict';
import test from 'node:test';
import { getServerPurposeCharacterCount, isFutureCertificateDate } from '../server/certificateValidation.ts';
import { purposeHtmlCases } from './purposeHtml.fixtures.mjs';

for (const [name, html, expected] of purposeHtmlCases) {
  test(`server HTML/Unicode count: ${name}`, () => {
    assert.equal(getServerPurposeCharacterCount(html), expected);
  });
}

test('future date validation is independent of Node process timezone', () => {
  const now = new Date('2026-10-09T00:30:00Z');
  assert.equal(isFutureCertificateDate('10/9/2026', 'America/Los_Angeles', now), true);
  assert.equal(isFutureCertificateDate('10/9/2026', 'Europe/Athens', now), false);
  assert.equal(isFutureCertificateDate('10/10/2026', 'Europe/Athens', now), true);
  assert.equal(isFutureCertificateDate('10/10/2026', 'Invalid/Zone', now), false);
  assert.equal(isFutureCertificateDate('10/10/2026', '+03:00', now), false);
  assert.equal(isFutureCertificateDate('2/30/2027', 'UTC', now), false);
});
