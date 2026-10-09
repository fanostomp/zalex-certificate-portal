import { z } from 'zod';
import { parseCertificateDate } from '../utils/certificateDates.ts';

export const certificateListItemSchema = z.object({
  reference_no: z.number(),
  address_to: z.string(),
  purpose: z.string(),
  issued_on: z.string().refine((value) => parseCertificateDate(value) !== null, {
    message: 'Expected a valid certificate date in M/D/YYYY format',
  }),
  status: z.string(),
});

export const createCertificateResponseSchema = z.object({ responce: z.literal('Ok') });
