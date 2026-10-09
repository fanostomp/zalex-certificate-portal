import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm font-bold tracking-widest text-indigo-700">404</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">Page not found</h1>
      <p className="mt-3 text-slate-600">This page does not exist in the certificate portal.</p>
      <Link to="/requests/new" className="mt-6 inline-flex rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        Back to certificate request
      </Link>
    </section>
  )
}
