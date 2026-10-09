import { z } from 'zod';
import { parseCertificateDate } from '../utils/certificateDates.ts';

export type CreateCertificateRequest ={
    address_to: string;
    purpose: string;
    issued_on: string;
    employee_id: string; 
};

const certificateListItemSchema = z.object({
  reference_no: z.number(),
  address_to: z.string(),
  purpose: z.string(),
  issued_on: z.string().refine((value) => parseCertificateDate(value) !== null, {
    message: 'Expected a valid certificate date in M/D/YYYY format',
  }),
  status: z.string(),
});

export type CertificateListItem =
  z.infer<typeof certificateListItemSchema>;

export type CreateCertificateResponse = {
    responce: string;
}

export async function createCertificateRequest(
  payload: CreateCertificateRequest
): Promise<CreateCertificateResponse> {

  const apiKey = import.meta.env.VITE_ZALEX_API_KEY;

  if (!apiKey) {
    throw new Error('Zalex API key is missing');
  }

  const url = new URL(
    'https://zalexinc.azure-api.net/request-certificate'
  );

  url.searchParams.set('subscription-key', apiKey);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== 'object' ||
    data === null ||
    !('responce' in data) ||
    data.responce !== 'Ok'
  ) {
    throw new Error('Unexpected API response');
  }

  return { responce: data.responce };
}

export async function getCertificateRequests(
  signal?: AbortSignal
): Promise<CertificateListItem[]> {
  const apiKey = import.meta.env.VITE_ZALEX_API_KEY;

  if (!apiKey) {
    throw new Error('Zalex API key is missing');
  }

  const url = new URL(
    'https://zalexinc.azure-api.net/request-list'
  );

  url.searchParams.set('subscription-key', apiKey);

  const response = await fetch(url.toString(), {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch certificates: ${response.status}`
    );
  }

  const data: unknown = await response.json();

  return z.array(certificateListItemSchema).parse(data);
}
