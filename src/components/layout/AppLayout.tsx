import { NavLink, Outlet } from 'react-router'
import {useRef, useEffect, useState, Suspense} from 'react'
import {useLocation} from 'react-router'
import { CertificateApiError, createCertificateRequest, getSubmissionErrorMessage, type CreateCertificateRequest } from '../../api/CertificateApi'
import RouteErrorBoundary from './RouteErrorBoundary'

type CertificateSubmission =
  | { status: 'idle' | 'pending' | 'success' }
  | { status: 'error'; message: string; outcomeUnknown: boolean }

export type CertificateSubmissionContext = {
  submission: CertificateSubmission;
  submitRequest: (payload: CreateCertificateRequest) => Promise<void>;
  clearFeedback: () => void;
}

const navigation = [
  { to: '/requests/new', label: 'Request certificate', shortLabel: 'New request' },
  { to: '/requests', label: 'Requests list', shortLabel: 'All requests' },
]

export default function AppLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const location = useLocation();
  const previousPathnameRef = useRef(location.pathname)
  const [submission, setSubmission] = useState<CertificateSubmission>({ status: 'idle' })
  const pendingSubmissionRef = useRef(false)

  async function submitRequest(payload: CreateCertificateRequest) {
    if (pendingSubmissionRef.current) return;
    pendingSubmissionRef.current = true;
    setSubmission({ status: 'pending' });
    try {
      await createCertificateRequest(payload);
      setSubmission({ status: 'success' });
    } catch (error) {
      setSubmission({ status: 'error', message: getSubmissionErrorMessage(error),
        outcomeUnknown: error instanceof CertificateApiError && error.outcomeUnknown });
    } finally {
      pendingSubmissionRef.current = false;
    }
  }

  function clearFeedback() {
    setSubmission(current => current.status === 'idle' || current.status === 'pending'
      || (current.status === 'error' && current.outcomeUnknown) ? current : { status: 'idle' });
  }

  useEffect(() => {
    if (submission.status !== 'pending') return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [submission.status]);
  useEffect(() => {
    if (previousPathnameRef.current !== location.pathname) {
      mainRef.current?.focus();

      previousPathnameRef.current = location.pathname;
    }
  }, [location.pathname]);
  useEffect(() => {
      if (location.pathname === '/requests/new') {
        document.title = 'Request Certificate | Zalex';
      } else if (location.pathname === '/requests') {
        document.title = 'Requests List | Zalex';
      } else {
        document.title = 'Page Not Found | Zalex';
      }
  }, [location.pathname]);
  return (
    <div className="min-h-screen bg-[#f5f7fc] text-slate-900">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-white px-4 py-2 text-sm text-slate-900 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col lg:flex-row">
        <aside className="relative overflow-hidden border-b border-white/10 bg-[#121d37] px-5 py-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-b-0 lg:px-6 lg:py-8">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-700 text-lg font-bold tracking-tight text-white shadow-lg shadow-indigo-950/30 ring-1 ring-white/20">
              Z
            </span>
            <div>
              <p className="text-base font-bold leading-5 tracking-tight text-white">Zalex Inc.</p>
              <p className="mt-1 text-xs text-slate-300">Employee services</p>
            </div>
          </div>

          <nav aria-label="Main navigation" className="mt-6 flex gap-2 lg:mt-12 lg:flex-col">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/requests'}
                className={({ isActive }) =>
                  `inline-flex min-h-11 flex-1 items-center justify-center gap-3 rounded-xl px-3 py-3 text-center text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:flex-none lg:justify-start lg:px-4 lg:text-left ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/10'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="hidden size-5 shrink-0 lg:block" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={item.to === '/requests/new' ? 'M12 5v14M5 12h14' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
                <span className="lg:hidden">{item.shortLabel}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto hidden border-t border-white/10 pt-6 lg:block">
            <p className="text-xs font-medium uppercase tracking-widest text-indigo-200">Employee portal</p>
            <p className="mt-2 text-sm text-slate-300">Simple, secure request management</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 backdrop-blur sm:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Human resources</p>
              <p className="mt-1 text-sm text-slate-500">Employment certificates</p>
            </div>
            <span className="hidden items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 sm:inline-flex">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-indigo-600" />
              Employee portal
            </span>
          </header>

          <main ref={mainRef} id="main-content" tabIndex={-1} className="w-full flex-1 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.055),_transparent_55%)] px-5 py-9 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <div className="mx-auto w-full max-w-6xl">
              {submission.status !== 'idle' && (
                <div className={`mb-6 rounded-xl border p-4 text-sm font-medium ${submission.status === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800' : submission.status === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-indigo-200 bg-indigo-50 text-indigo-900'}`}>
                  {submission.status === 'error' ? <p role="alert">{submission.message}</p> : (
                    <output aria-live="polite" aria-atomic="true" className="block">
                      {submission.status === 'pending'
                        ? 'Submitting your certificate request… You can navigate within the portal; the result will appear here.'
                        : 'Your certificate request was submitted successfully.'}
                    </output>
                  )}
                  {submission.status !== 'pending' && (
                    <button type="button" onClick={() => setSubmission({ status: 'idle' })}
                      className="mt-2 rounded-md px-2 py-1 text-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                      Dismiss submission feedback
                    </button>
                  )}
                </div>
              )}
              <RouteErrorBoundary key={location.pathname}>
                <Suspense fallback={<output aria-live="polite" className="block py-8 text-slate-600">Loading page…</output>}>
                  <Outlet context={{ submission, submitRequest, clearFeedback } satisfies CertificateSubmissionContext} />
                </Suspense>
              </RouteErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
