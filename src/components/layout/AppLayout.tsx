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
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
