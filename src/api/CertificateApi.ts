import { z } from 'zod';
import { certificateListItemSchema, createCertificateResponseSchema } from './certificateContracts.ts';

export type CreateCertificateRequest ={
    address_to: string;
    purpose: string;
    issued_on: string;
    employee_id: string; 
};

export type CertificateListItem =
  z.infer<typeof certificateListItemSchema>;

export type CreateCertificateResponse = {
    responce: string;
}

export class CertificateApiError extends Error {
  readonly status: number | null;
  readonly outcomeUnknown: boolean;

  constructor(message: string, status: number | null, outcomeUnknown = false) {
    super(message);
    this.name = 'CertificateApiError';
    this.status = status;
    this.outcomeUnknown = outcomeUnknown;
  }
}

export function getSubmissionErrorMessage(error: unknown): string {
  if (error instanceof CertificateApiError) {
    if (error.outcomeUnknown) {
      return 'The submission outcome is unknown. Your request may have been processed. Verify the outcome before submitting again.';
    }
    switch (error.status) {
      case 400: return 'The service could not validate this request. Check all fields and the issue date, then submit again.';
      case 413: return 'The request is too large. Shorten the Purpose text or recipient, then submit again.';
      case 429: return 'Too many requests. Wait before submitting again.';
      case 503: return 'The certificate service is temporarily unavailable. Please try again later.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export async function createCertificateRequest(
  payload: CreateCertificateRequest
): Promise<CreateCertificateResponse> {

  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    body: JSON.stringify(payload),
  };

  let response: Response;
  try {
    response = await fetch('/api/request-certificate', options);
  } catch {
    throw new CertificateApiError('Submission outcome is unknown', null, true);
  }

  if (!response.ok) {
    throw new CertificateApiError(`Request failed: ${response.status}`, response.status,
      response.status === 502 || response.status === 504);
  }

  try {
    const data: unknown = await response.json();
    return createCertificateResponseSchema.parse(data);
  } catch {
    throw new CertificateApiError(`Unconfirmed submission response: ${response.status}`, response.status, true);
  }
}

export async function getCertificateRequests(
  signal?: AbortSignal
): Promise<CertificateListItem[]> {
  const response = await fetch('/api/request-list', {
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
