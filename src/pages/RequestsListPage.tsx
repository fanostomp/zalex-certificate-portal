import { useEffect, useRef, useState } from 'react';
import { getCertificateRequests } from '../api/CertificateApi';
import { createCertificateRows, filterCertificateRows, sortCertificateRows, type CertificateRequestRow, type SortField } from '../components/certificates/certificateRows';


const columns = ['Reference No.', 'Address to', 'Purpose', 'Issued on', 'Status']


export default function RequestsListPage() {
  const [requests, setRequests] = useState<CertificateRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tableScrollRef = useRef<HTMLElement>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortField, setSortField] = useState<SortField>('issued_on');
  const [referenceFilter, setReferenceFilter] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadRequests() {
      try {
        const data = await getCertificateRequests(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setRequests(createCertificateRows(data));
        }
      } catch {
        if (!controller.signal.aborted) {
          setError('Failed to load certificate requests.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      controller.abort();
    };
  }, []);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) =>
        current === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setSortField(field);
      setSortDirection(
        field === 'issued_on' ? 'desc' : 'asc'
      );
    }
  }

  const filteredRequests = filterCertificateRows(requests, {
    reference: referenceFilter, address: addressFilter, status: statusFilter,
  });

  const availableStatuses = [
    ...new Set(requests.map((request) => request.status)),
  ].sort((a, b) => a.localeCompare(b, 'en'));

  const sortedRequests = sortCertificateRows(filteredRequests, sortField, sortDirection);

  return (
    <section aria-labelledby="requests-heading" className="space-y-8">
      <div>
        <p className="text-sm font-medium text-indigo-700">Certificate services / All requests</p>
        <h1 id="requests-heading" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Requests list
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Review your submitted certificate requests and follow their status.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <h2 className="text-base font-semibold text-slate-900">Submitted requests</h2>
          <output aria-live="polite" aria-atomic="true" className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
           {isLoading
            ? 'Loading...'
            : error
              ? 'Unable to load'
              : `${sortedRequests.length} of ${requests.length} requests`}
          </output>
        </div>
        <div className="grid grid-cols-1 gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-8">
  <div>
    <label
      htmlFor="filter-reference"
      className="mb-2 block text-sm font-medium text-slate-700"
    >
      Reference No.
    </label>
    <input
      id="filter-reference"
      type="text"
      inputMode="numeric"
      value={referenceFilter}
      onChange={(event) => setReferenceFilter(event.target.value)}
      placeholder="e.g. 50"
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600"
    />
  </div>

  <div>
    <label
      htmlFor="filter-address"
      className="mb-2 block text-sm font-medium text-slate-700"
    >
      Address to
    </label>
    <input
      id="filter-address"
      type="search"
      value={addressFilter}
      onChange={(event) => setAddressFilter(event.target.value)}
      placeholder="e.g. bank mars"
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600"
    />
  </div>

  <div>
    <label
      htmlFor="filter-status"
      className="mb-2 block text-sm font-medium text-slate-700"
    >
      Status
    </label>
    <select
      id="filter-status"
      value={statusFilter}
      onChange={(event) => setStatusFilter(event.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600"
    >
      <option value="">All statuses</option>

      {availableStatuses.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  </div>

      <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setReferenceFilter('');
              setAddressFilter('');
              setStatusFilter('');
            }}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            Clear filters
          </button>
        </div>
      </div>
        <section
          id="requests-table-scroll"
          ref={tableScrollRef}
          aria-label="Certificate requests table"
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600"
        >
          <table aria-busy={isLoading} className="min-w-[720px] w-full text-left text-sm">
            <caption className="sr-only">
              Employee certificate requests
            </caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((column) => {
                  const field: SortField | null =
                    column === 'Issued on'
                      ? 'issued_on'
                      : column === 'Status'
                        ? 'status'
                        : null;

                  return (
                    <th
                      key={column}
                      scope="col"
                      aria-sort={
                        field && sortField === field
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      className="whitespace-nowrap px-6 py-4 font-semibold"
                    >
                      {field ? (
                        <button
                          type="button"
                          onClick={() => handleSort(field)}
                          className="inline-flex items-center gap-1 rounded hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600"
                        >
                          {column}

                          {sortField === field && (
                            <span aria-hidden="true">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      ) : (
                        column
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    Loading certificate requests...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-red-600">
                    <p role="alert">{error} Please try again by reopening this page.</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    No certificate requests found.
                  </td>
                </tr>
              ): sortedRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-slate-600"
                  >
                    No matching requests. Try adjusting or clearing your filters.
                  </td>
                </tr>
              ) : (
                sortedRequests.map((request) => (
                  <tr
                    key={request.rowId}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-medium">
                      {request.reference_no}
                    </td>

                    <td className="px-6 py-4">
                      {request.address_to}
                    </td>

                    <td className="px-6 py-4">
                      {request.purpose}
                    </td>

                    <td className="px-6 py-4">
                      {request.issuedOnIso ? (
                        <time dateTime={request.issuedOnIso}>{request.issued_on}</time>
                      ) : 'Date unavailable'}
                    </td>

                    <td className="px-6 py-4">
                      {request.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3 xl:hidden">
          <button
            type="button"
            aria-label="Scroll requests table left"
            aria-controls="requests-table-scroll"
            onClick={() => tableScrollRef.current?.scrollBy({ left: -240 })}
            className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >Scroll left</button>
          <button
            type="button"
            aria-label="Scroll requests table right"
            aria-controls="requests-table-scroll"
            onClick={() => tableScrollRef.current?.scrollBy({ left: 240 })}
            className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >Scroll right</button>
        </div>
      </div>
    </section>
  )
}
