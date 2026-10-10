import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import PurposeEditor from './PurposeEditor';
import { certificateSchema, toApiPayload, toLocalDateString, type CertificateFormValues } from './certificateFormValidation';
import type { CertificateSubmissionContext } from '../layout/AppLayout';

export default function CertificateRequestForm() {
    const { submission, submitRequest, clearFeedback } = useOutletContext<CertificateSubmissionContext>();
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting: isFormSubmitting },
        } = useForm<CertificateFormValues>({
        resolver: zodResolver(certificateSchema),
        mode: 'onChange',
        defaultValues: {
            addressTo: '',
            purpose: '',
            issuedOn: '',
            employeeId: '',
        },
    });
    const isSubmitting = isFormSubmitting || submission.status === 'pending';
    const onSubmit = (data: CertificateFormValues) => submitRequest(toApiPayload(data));
    const [minIssuedOn] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        return toLocalDateString(tomorrow);
    });

    return (
        <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            onChange={clearFeedback}
            aria-busy={isSubmitting}
        >
            <fieldset disabled={isSubmitting} className="min-w-0">
                <legend className="sr-only">Certificate request details</legend>
            <div>
                <label htmlFor="addressTo" className="block text-sm font-medium text-slate-700">
                    Address to
                </label>

                <textarea className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm shadow-sm transition-all outline-none placeholder:text-slate-600 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    id='addressTo'
                    {...register("addressTo", { deps: ['purpose'] })}
                    placeholder="Enter recipient"
                    aria-invalid={Boolean(errors.addressTo)}
                    aria-describedby={
                        errors.addressTo ? 'addressTo-error' : undefined
                    }
                />
                {errors.addressTo && (
                    <p
                        id="addressTo-error"
                        role="alert"
                        className="mt-2 text-sm text-red-600"
                    >
                        {errors.addressTo.message}
                    </p>
                )}  
            </div>
                <Controller
                    name="purpose"
                    control={control}
                    render={({ field, fieldState }) => (
                        <PurposeEditor
                        value={field.value}
                        onChange={(html) => {
                            clearFeedback();
                            field.onChange(html);
                        }}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        disabled={isSubmitting}
                        error={fieldState.error?.message}
                        />
                    )}
                />
                <div className="mt-6">
                    <label
                        htmlFor="issuedOn"
                        className="block text-sm font-medium text-slate-700"
                    >
                        Issued on
                    </label>

                    <input
                        id="issuedOn"
                        type="date"
                        min={minIssuedOn}
                        {...register('issuedOn', { deps: ['purpose'] })}
                        aria-invalid={Boolean(errors.issuedOn)}
                        aria-describedby={
                        errors.issuedOn ? 'issuedOn-error' : undefined
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm shadow-sm transition-all outline-none placeholder:text-slate-600 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />

                    {errors.issuedOn && (
                        <p
                        id="issuedOn-error"
                        role="alert"
                        className="mt-2 text-sm text-red-600"
                        >
                        {errors.issuedOn.message}
                        </p>
                    )}
                    </div>
            <div className="mt-6">
                <label
                    htmlFor="employeeId"
                    className="block text-sm font-medium text-slate-700"
                >
                    Employee ID
                </label>

                <input
                    id="employeeId"
                    type="text"
                    inputMode="numeric"
                    {...register('employeeId', { deps: ['purpose'] })}
                    aria-invalid={Boolean(errors.employeeId)}
                    aria-describedby={
                    errors.employeeId ? 'employeeId-error' : undefined
                    }
                    placeholder="e.g. 123456"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm shadow-sm transition-all outline-none placeholder:text-slate-600 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />

                {errors.employeeId && (
                    <p
                    id="employeeId-error"
                    role="alert"
                    className="mt-2 text-sm text-red-600"
                    >
                    {errors.employeeId.message}
                    </p>
                )}
                </div>
            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-700 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-700/20 transition-all hover:bg-indigo-800 hover:shadow-indigo-700/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
            </fieldset>
        </form>
    );
}
