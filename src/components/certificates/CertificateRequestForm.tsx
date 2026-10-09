import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import PurposeEditor from './PurposeEditor';
import { getPurposeCharacterCount } from './purposeText';
import { formatApiDate } from '../../utils/certificateDates';
import {createCertificateRequest, type CreateCertificateRequest,} from '../../api/CertificateApi';

function toApiPayload(
    values: CertificateFormValues
    ): CreateCertificateRequest {
    return {
        address_to: values.addressTo,
        purpose: values.purpose,
        issued_on: formatApiDate(values.issuedOn),
        employee_id: values.employeeId,
    };
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
function isFutureDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const selected = new Date(`${value}T00:00:00`);

    if (
        Number.isNaN(selected.getTime()) ||
        toLocalDateString(selected) !== value
    ) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selected > today;
}
const certificateSchema = z.object({
  addressTo: z
    .string()
    .trim()
    .min(1, 'Address to is required')
    .regex(
      /^[\p{L}\p{N}\s]+$/u,
      'Only letters, numbers and spaces are allowed'
    ),
    purpose: z.string().superRefine((html, context) => {
        const count = getPurposeCharacterCount(html);
        if (count < 50) {
            context.addIssue({
                code: 'custom',
                message: count === 0
                    ? 'Purpose is required'
                    : 'Purpose must contain at least 50 visible characters',
            });
        }
    }),
    employeeId: z
        .string()
        .trim()
        .min(1, 'Employee ID is required')
        .regex(/^\d+$/, 'Employee ID must contain digits only'),
    issuedOn: z
        .string()
        .min(1, 'Issued on is required')
        .refine(
            (value) => value === '' || isFutureDate(value),
            'Issued on must be a future date'
    ),
});     

type CertificateFormValues = z.infer<typeof certificateSchema>;
export default function CertificateRequestForm() {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
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
    const [submitStatus, setSubmitStatus] = useState<
        'idle' | 'success' | 'error'
    >('idle');
    const onSubmit = async (data: CertificateFormValues) => {
        setSubmitStatus('idle');

        try {
            const payload = toApiPayload(data);

            await createCertificateRequest(payload);

            setSubmitStatus('success');
        } catch {
            setSubmitStatus('error');
        }
    };
    const [minIssuedOn] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        return toLocalDateString(tomorrow);
    });

    return (
        <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            onChange={() => setSubmitStatus('idle')}
            aria-busy={isSubmitting}
        >
            <fieldset disabled={isSubmitting} className="min-w-0">
                <legend className="sr-only">Certificate request details</legend>
            <div>
                <label htmlFor="addressTo" className="block text-sm font-medium text-slate-700">
                    Address to
                </label>

                <textarea className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    id='addressTo'
                    {...register("addressTo")}
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
                            setSubmitStatus('idle');
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
                        {...register('issuedOn')}
                        aria-invalid={Boolean(errors.issuedOn)}
                        aria-describedby={
                        errors.issuedOn ? 'issuedOn-error' : undefined
                        }
                        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                    {...register('employeeId')}
                    aria-invalid={Boolean(errors.employeeId)}
                    aria-describedby={
                    errors.employeeId ? 'employeeId-error' : undefined
                    }
                    placeholder="e.g. 123456"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                className="mt-6 rounded-lg bg-indigo-700 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
            </fieldset>
            {submitStatus === 'success' && (
                <output
                    className="mt-4 block rounded-lg bg-green-50 p-4 text-sm text-green-800"
                >
                    Your certificate request was submitted successfully.
                </output>
            )}

            {submitStatus === 'error' && (
            <p
                role="alert"
                className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700"
            >
                Something went wrong. Please try again.
            </p>
            )}
        </form>
    );
}
