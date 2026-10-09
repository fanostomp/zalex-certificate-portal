import CertificateRequestForm from '../components/certificates/CertificateRequestForm';

export default function NewRequestPage() {
  return (
    <section aria-labelledby="request-heading" className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Certificate services / New request</p>
        <h1 id="request-heading" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.6rem]">
          Request a certificate
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Employment certificate requests, made simpler. Tell us what you need and submit your request.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_48px_-28px_rgba(20,34,70,0.32)]">
        <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-indigo-50/50 px-6 py-6 sm:px-8">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3h8l4 4v14H4V3h4zM15 3v5h5M8 13h8M8 17h5"/></svg></span><div><p className="text-base font-bold text-slate-900">Certificate details</p>
          <p className="mt-1 text-sm text-slate-600">Complete all four fields to submit your certificate request.</p></div>
        </div>
        <div className="p-6 sm:p-9">
          <CertificateRequestForm />
        </div>
        <div className="border-t border-indigo-100 bg-indigo-50/70 px-6 py-4 sm:px-9">
          <p className="text-sm leading-6 text-indigo-900">Choose a future issue date and describe your purpose in at least 50 visible characters.</p>
        </div>
      </div>
    </section>
  )
}
