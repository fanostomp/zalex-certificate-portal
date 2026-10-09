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

export async function createCertificateRequest(
  payload: CreateCertificateRequest
): Promise<CreateCertificateResponse> {

  const response = await fetch('/api/request-certificate', {
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

  return createCertificateResponseSchema.parse(data);
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
