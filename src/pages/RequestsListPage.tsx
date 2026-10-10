import { useEffect, useRef, useState } from 'react';
import { getCertificateRequests } from '../api/CertificateApi';
import { createCertificateRows, filterCertificateRows, sortCertificateRows, type CertificateRequestRow, type SortField } from '../components/certificates/certificateRows';


const columns = ['Reference No.', 'Address to', 'Purpose', 'Issued on', 'Status']


export default function RequestsListPage() {
  const [requests, setRequests] = useState<CertificateRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
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
  }, [loadVersion]);

  function retryRequests() {
    setError(null);
    setIsLoading(true);
    setLoadVersion(current => current + 1);
  }

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
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Certificate services / All requests</p>
        <h1 id="requests-heading" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.6rem]">
          Requests list
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Review your submitted certificate requests and follow their status.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_48px_-28px_rgba(20,34,70,0.32)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-white to-indigo-50/50 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <h2 className="text-base font-bold text-slate-900">Submitted requests</h2>
          <output aria-live="polite" aria-atomic="true" className="w-fit rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">
           {isLoading
            ? 'Loading...'
            : error
              ? 'Unable to load'
              : `${sortedRequests.length} of ${requests.length} requests`}
          </output>
        </div>
        <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50/40 px-6 py-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
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
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
          <table aria-busy={isLoading} className="min-w-[760px] w-full text-left text-sm">
            <caption className="sr-only">
              Employee certificate requests
            </caption>
            <thead className="bg-slate-50/90 text-[11px] uppercase tracking-[0.12em] text-slate-600">
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
                      className="whitespace-nowrap px-6 py-4 font-bold"
                    >
                      {field ? (
                        <button
                          type="button"
                          onClick={() => handleSort(field)}
                          className="inline-flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
                    <div className="max-w-[220px] text-left sm:max-w-none sm:text-center">
                    <p role="alert">{error}</p>
                    <button type="button" onClick={retryRequests} aria-label="Retry loading requests"
                      className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                      Retry
                    </button>
                    </div>
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
                    className="border-t border-slate-100 transition-colors hover:bg-indigo-50/40"
                  >
                    <td className="px-6 py-4 font-bold tabular-nums text-indigo-800">
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
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${request.status.toLowerCase() === 'done' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : request.status.toLowerCase() === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-sky-200 bg-sky-50 text-sky-800'}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{request.status}</span>
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
