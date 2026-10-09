import CertificateRequestForm from '../components/certificates/CertificateRequestForm';

export default function NewRequestPage() {
  return (
    <section aria-labelledby="request-heading" className="space-y-8">
      <div>
        <p className="text-sm font-medium text-indigo-700">Certificate services / New request</p>
        <h1 id="request-heading" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Request a certificate
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Employment certificate requests, made simpler. Tell us what you need and submit your request.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
          <p className="text-base font-semibold text-slate-900">Certificate details</p>
          <p className="mt-1 text-sm text-slate-500">Complete all four fields to submit your certificate request.</p>
        </div>
        <div className="p-6 sm:p-8">
          <CertificateRequestForm />
        </div>
        <div className="border-t border-indigo-100 bg-indigo-50/60 px-6 py-4 sm:px-8">
          <p className="text-sm text-indigo-800">Choose a future issue date and describe your purpose in at least 50 visible characters.</p>
        </div>
      </div>
    </section>
  )
}
