import { z } from 'zod';
import type { CreateCertificateRequest } from '../../api/CertificateApi.ts';
import { formatApiDate } from '../../utils/certificateDates.ts';
import { getPurposeCharacterCount } from './purposeText.ts';

const MAX_REQUEST_BYTES = 32 * 1024;

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isFutureDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const selected = new Date(`${value}T00:00:00`);
  if (Number.isNaN(selected.getTime()) || toLocalDateString(selected) !== value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected > today;
}

export function getCertificatePayloadByteLength(payload: CreateCertificateRequest): number {
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

export function createCertificateFormSchema(countPurpose = getPurposeCharacterCount) {
  return z.object({
    addressTo: z.string().transform(value => value.trim().normalize('NFC')).pipe(
      z.string()
        .min(1, 'Address to is required')
        .max(500, 'Address to must contain at most 500 characters')
        .regex(/^[\p{L}\p{N}\s]+$/u, 'Only letters, numbers and spaces are allowed'),
    ),
    purpose: z.string()
      .refine(html => html.length <= 24_000,
        'Purpose HTML must contain at most 24,000 characters. Shorten the text or remove formatting.')
      .superRefine((html, context) => {
        if (html.length > 24_000) return;
        const count = countPurpose(html);
        if (count < 50) context.addIssue({
          code: 'custom',
          message: count === 0 ? 'Purpose is required' : 'Purpose must contain at least 50 visible characters',
        });
      }),
    employeeId: z.string().trim()
      .min(1, 'Employee ID is required')
      .max(100, 'Employee ID must contain at most 100 digits')
      .regex(/^\d+$/, 'Employee ID must contain digits only'),
    issuedOn: z.string()
      .min(1, 'Issued on is required')
      .refine(value => value === '' || isFutureDate(value), 'Issued on must be a future date'),
  }).superRefine((values, context) => {
    if (!isFutureDate(values.issuedOn)) return;
    if (getCertificatePayloadByteLength(toApiPayload(values)) > MAX_REQUEST_BYTES) {
      context.addIssue({
        code: 'custom', path: ['purpose'],
        message: 'Request exceeds 32 KiB. Shorten the Purpose text or recipient.',
      });
    }
  });
}

export const certificateSchema = createCertificateFormSchema();
export type CertificateFormValues = z.infer<typeof certificateSchema>;

export function toApiPayload(values: CertificateFormValues): CreateCertificateRequest {
  return {
    address_to: values.addressTo,
    purpose: values.purpose,
    issued_on: formatApiDate(values.issuedOn),
    employee_id: values.employeeId,
  };
}
