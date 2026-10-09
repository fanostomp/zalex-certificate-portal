import type { CertificateListItem } from '../../api/CertificateApi';
import { parseCertificateDate } from '../../utils/certificateDates.ts';

export type CertificateRequestRow = CertificateListItem & {
  rowId: string;
  issuedOnSortValue: number | null;
  issuedOnIso: string | null;
};

export type SortField = 'issued_on' | 'status';
export type SortDirection = 'asc' | 'desc';
export type CertificateFilters = { reference: string; address: string; status: string };

export function filterCertificateRows(
  rows: readonly CertificateRequestRow[], filters: CertificateFilters,
): CertificateRequestRow[] {
  const reference = filters.reference.trim();
  const addressWords = filters.address.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) =>
    (reference === '' || String(row.reference_no) === reference)
    && addressWords.every((word) => row.address_to.toLocaleLowerCase().includes(word))
    && (filters.status === '' || row.status === filters.status));
}

export function sortCertificateRows(
  rows: readonly CertificateRequestRow[], field: SortField, direction: SortDirection,
): CertificateRequestRow[] {
  return [...rows].sort((a, b) => {
    if (field === 'status') {
      const comparison = a.status.localeCompare(b.status, 'en', { sensitivity: 'base' });
      return direction === 'asc' ? comparison : -comparison;
    }
    if (a.issuedOnSortValue === null) return b.issuedOnSortValue === null ? 0 : 1;
    if (b.issuedOnSortValue === null) return -1;
    return direction === 'asc'
      ? a.issuedOnSortValue - b.issuedOnSortValue
      : b.issuedOnSortValue - a.issuedOnSortValue;
  });
}

export function createCertificateRows(records: readonly CertificateListItem[]): CertificateRequestRow[] {
  // The API has no unique ID. Allocate once per fetched record, before any
  // sorting/filtering. These IDs intentionally do not persist across refetches.
  return records.map((record) => {
    const date = parseCertificateDate(record.issued_on);
    return {
      ...record,
      rowId: crypto.randomUUID(),
      issuedOnSortValue: date?.sortValue ?? null,
      issuedOnIso: date?.isoDate ?? null,
    };
  });
}
