import { NavLink, Outlet } from 'react-router'
import {useRef, useEffect} from 'react'
import {useLocation} from 'react-router'

const navigation = [
  { to: '/requests/new', label: 'Request certificate', shortLabel: 'New request' },
  { to: '/requests', label: 'Requests list', shortLabel: 'All requests' },
]

export default function AppLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const location = useLocation();
  const previousPathnameRef = useRef(location.pathname)
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-white px-4 py-2 text-sm text-slate-900 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white px-5 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-indigo-700 text-lg font-bold tracking-tight text-white shadow-sm">
              Z
            </span>
            <div>
              <p className="text-base font-bold leading-5 tracking-tight">Zalex Inc.</p>
              <p className="mt-1 text-xs text-slate-500">Employee services</p>
            </div>
          </div>

          <nav aria-label="Main navigation" className="mt-6 flex gap-2 lg:mt-12 lg:flex-col">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/requests'}
                className={({ isActive }) =>
                  `inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-3 text-center text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 lg:flex-none lg:justify-start lg:px-4 lg:text-left ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <span className="lg:hidden">{item.shortLabel}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto hidden border-t border-slate-100 pt-6 lg:block">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-600">Employee portal</p>
            <p className="mt-2 text-sm text-slate-500">Certificate services MVP</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 sm:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Human resources</p>
              <p className="mt-1 text-sm text-slate-500">Employment certificates</p>
            </div>
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">
              MVP workspace
            </span>
          </header>

          <main ref={mainRef} id="main-content" tabIndex={-1} className="w-full flex-1 px-6 py-10 sm:px-10 lg:px-14 lg:py-12">
            <div className="mx-auto w-full max-w-5xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
