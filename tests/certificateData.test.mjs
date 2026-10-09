import assert from 'node:assert/strict';
import test from 'node:test';
import { formatApiDate, parseCertificateDate } from '../src/utils/certificateDates.ts';
import { createCertificateRows, filterCertificateRows, sortCertificateRows } from '../src/components/certificates/certificateRows.ts';

test('API dates accept unpadded and padded calendar dates', () => {
  assert.deepEqual(parseCertificateDate('6/16/2023'), {
    year: 2023, month: 6, day: 16, isoDate: '2023-06-16', sortValue: 20230616,
  });
  assert.deepEqual(parseCertificateDate('06/16/2023'), parseCertificateDate('6/16/2023'));
});

test('API dates reject invalid formats and impossible calendar dates', () => {
  for (const value of ['2/30/2026', 'not-a-date', '2026-10-09', '13/1/2026',
    '0/1/2026', '4/31/2026', '2/29/2023', '1/1/0000', ' 6/16/2023', '6/16/2023x']) {
    assert.equal(parseCertificateDate(value), null, value);
  }
});

test('leap years follow the Gregorian calendar', () => {
  assert.notEqual(parseCertificateDate('2/29/2000'), null);
  assert.notEqual(parseCertificateDate('2/29/2024'), null);
  assert.equal(parseCertificateDate('2/29/1900'), null);
  assert.equal(parseCertificateDate('2/29/2100'), null);
});

test('date comparison values follow chronological order across years', () => {
  const earlier = parseCertificateDate('12/31/2025');
  const later = parseCertificateDate('1/1/2026');
  assert.ok(earlier.sortValue < later.sortValue);
});

test('POST dates use M/D/YYYY without timezone conversion', () => {
  assert.equal(formatApiDate('2026-03-04'), '3/4/2026');
  assert.equal(formatApiDate('2024-02-29'), '2/29/2024');
  assert.throws(() => formatApiDate('2026-02-30'));
  assert.throws(() => formatApiDate('not-a-date'));
});

test('row identity preserves all duplicate records without mutating API data', () => {
  const record = Object.freeze({ reference_no: 50, address_to: 'Example',
    purpose: 'Example purpose', issued_on: '6/16/2023', status: 'Pending' });
  const records = Object.freeze([record, record, record]);
  const rows = createCertificateRows(records);
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map(row => row.rowId)).size, 3);
  assert.equal('rowId' in record, false);
  for (const row of rows) {
    for (const key of Object.keys(record)) assert.equal(row[key], record[key]);
    assert.equal(row.issuedOnSortValue, 20230616);
    assert.equal(row.issuedOnIso, '2023-06-16');
  }
  const reordered = [...rows].reverse();
  const filtered = reordered.filter(row => row.rowId !== rows[1].rowId);
  assert.strictEqual(filtered[0], rows[2]);
  assert.strictEqual(filtered[1], rows[0]);
});

test('unexpected row dates keep the record and expose no misleading sort value', () => {
  const rows = createCertificateRows([{ reference_no: 50, address_to: 'Example',
    purpose: 'Example purpose', issued_on: 'not-a-date', status: 'Pending' }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].issued_on, 'not-a-date');
  assert.equal(rows[0].issuedOnSortValue, null);
  assert.equal(rows[0].issuedOnIso, null);
});

const listRows = Object.freeze(createCertificateRows([
  { reference_no: 50, address_to: 'Bank of Mars', purpose: 'A', issued_on: '12/31/2025', status: 'Pending' },
  { reference_no: 50, address_to: 'Bank of Mars', purpose: 'B', issued_on: '1/1/2026', status: 'Pending' },
  { reference_no: 50, address_to: 'Bank of Mars', purpose: 'B', issued_on: '1/1/2026', status: 'Pending' },
  { reference_no: 50, address_to: 'Bank of Venus', purpose: 'C', issued_on: '2/29/2024', status: 'Approved' },
  { reference_no: 5, address_to: 'Mars Bank', purpose: 'D', issued_on: '06/16/2023', status: 'Rejected' },
]).map(Object.freeze));
const filters = (overrides = {}) => ({ reference: '', address: '', status: '', ...overrides });
const purposes = (rows) => rows.map(row => row.purpose);

test('reference filtering is exact and trimmed, preserving duplicates', () => {
  assert.equal(filterCertificateRows(listRows, filters({ reference: ' 50 ' })).length, 4);
  assert.deepEqual(purposes(filterCertificateRows(listRows, filters({ reference: '5' }))), ['D']);
  assert.equal(filterCertificateRows(listRows, filters({ reference: '050' })).length, 0);
});

test('address filtering matches every word regardless of case or word order', () => {
  assert.deepEqual(purposes(filterCertificateRows(listRows, filters({ address: ' MARS   bank ' }))), ['A', 'B', 'B', 'D']);
  assert.equal(filterCertificateRows(listRows, filters({ address: 'Mars Venus' })).length, 0);
});

test('status filtering is exact and all three filters combine with AND', () => {
  assert.equal(filterCertificateRows(listRows, filters({ status: 'pending' })).length, 0);
  assert.deepEqual(purposes(filterCertificateRows(listRows, filters({ reference: '50', address: 'bank mars', status: 'Pending' }))), ['A', 'B', 'B']);
  assert.equal(filterCertificateRows(listRows, filters({ reference: '5', status: 'Pending' })).length, 0);
});

test('empty filters restore every row without changing row identity', () => {
  assert.deepEqual(filterCertificateRows(listRows, filters()), listRows);
  assert.strictEqual(filterCertificateRows(listRows, filters())[2], listRows[2]);
});

test('date sorting is chronological across years in both directions', () => {
  assert.deepEqual(purposes(sortCertificateRows(listRows, 'issued_on', 'asc')), ['D', 'C', 'A', 'B', 'B']);
  assert.deepEqual(purposes(sortCertificateRows(listRows, 'issued_on', 'desc')), ['B', 'B', 'A', 'C', 'D']);
});

test('status sorting is alphabetical in both directions and preserves equal-value order', () => {
  assert.deepEqual(purposes(sortCertificateRows(listRows, 'status', 'asc')), ['C', 'A', 'B', 'B', 'D']);
  assert.deepEqual(purposes(sortCertificateRows(listRows, 'status', 'desc')), ['D', 'A', 'B', 'B', 'C']);
});

test('sorting is immutable and keeps identical duplicates as separate rows', () => {
  const sorted = sortCertificateRows(listRows, 'issued_on', 'desc');
  assert.notStrictEqual(sorted, listRows);
  assert.deepEqual(purposes(listRows), ['A', 'B', 'B', 'C', 'D']);
  assert.strictEqual(sorted[0], listRows[1]);
  assert.strictEqual(sorted[1], listRows[2]);
  assert.notEqual(sorted[0].rowId, sorted[1].rowId);
});

test('sorting works after filtering without mutating the filtered array', () => {
  const filtered = Object.freeze(filterCertificateRows(listRows, filters({ reference: '50', status: 'Pending' })));
  assert.deepEqual(purposes(sortCertificateRows(filtered, 'issued_on', 'desc')), ['B', 'B', 'A']);
  assert.deepEqual(purposes(filtered), ['A', 'B', 'B']);
  const multipleStatuses = filterCertificateRows(listRows, filters({ reference: '50' }));
  assert.deepEqual(purposes(sortCertificateRows(multipleStatuses, 'status', 'asc')), ['C', 'A', 'B', 'B']);
  assert.deepEqual(purposes(sortCertificateRows(multipleStatuses, 'status', 'desc')), ['A', 'B', 'B', 'C']);
});

test('unavailable dates remain last in both directions, with stable ties', () => {
  const invalid = createCertificateRows([
    { ...listRows[0], purpose: 'X', issued_on: 'bad' },
    { ...listRows[0], purpose: 'Y', issued_on: 'bad' },
  ]);
  for (const direction of ['asc', 'desc']) {
    assert.deepEqual(purposes(sortCertificateRows([...invalid, listRows[0]], 'issued_on', direction)), ['A', 'X', 'Y']);
  }
});
