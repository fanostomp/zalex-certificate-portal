import { z } from 'zod';
import { certificateListItemSchema, createCertificateResponseSchema } from '../src/api/certificateContracts.ts';
import { parseCertificateDate } from '../src/utils/certificateDates.ts';
import { getServerPurposeCharacterCount, isFutureCertificateDate } from './certificateValidation.ts';

export const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const TIMEOUT_MS = 10_000;
type Endpoint = 'request-list' | 'request-certificate';

const payloadSchema = z.strictObject({
  address_to: z.string().min(1).max(500).refine((value) => value.trim().length > 0 && /^[\p{L}\p{N}\s]+$/u.test(value)),
  purpose: z.string().min(1).max(24_000).refine((value) => value.length <= 24_000 && getServerPurposeCharacterCount(value) >= 50),
  issued_on: z.string().max(10).refine((value) => parseCertificateDate(value) !== null),
  employee_id: z.string().min(1).max(100).regex(/^\d+$/),
});

export function errorResponse(status: number, error: string, headers?: Record<string, string>): Response {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

class PayloadTooLarge extends Error {}

// Count actual streamed bytes as well as the declared length; do not trust headers.
async function boundedText(message: Request | Response, limit: number): Promise<string> {
  const declared = Number(message.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) {
    await message.body?.cancel();
    throw new PayloadTooLarge();
  }
  if (!message.body) return '';
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new PayloadTooLarge();
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

export async function proxyCertificate(request: Request, endpoint: Endpoint, apiKey = process.env.ZALEX_API_KEY): Promise<Response> {
  const method = endpoint === 'request-list' ? 'GET' : 'POST';
  if (request.method !== method) return errorResponse(405, 'Method not allowed', { Allow: method });
  if (!apiKey?.trim()) return errorResponse(503, 'Certificate service is not configured');

  let body: string | undefined;
  if (method === 'POST') {
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return errorResponse(415, 'Expected application/json');
    }
    try {
      const parsed = payloadSchema.safeParse(JSON.parse(await boundedText(request, MAX_REQUEST_BYTES)));
      const timeZone = request.headers.get('X-Client-Timezone') ?? 'UTC';
      if (!parsed.success || !isFutureCertificateDate(parsed.data.issued_on, timeZone)) {
        return errorResponse(400, 'Invalid certificate payload');
      }
      body = JSON.stringify(parsed.data);
    } catch (error) {
      return errorResponse(error instanceof PayloadTooLarge ? 413 : 400,
        error instanceof PayloadTooLarge ? 'Certificate payload too large' : 'Invalid certificate payload');
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Fixed destination, no incoming query parameters, headers or cookies forwarded.
    const url = new URL(`https://zalexinc.azure-api.net/${endpoint}`);
    url.searchParams.set('subscription-key', apiKey);
    const upstream = await fetch(url, {
      method, redirect: 'error', signal: controller.signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body } : {}),
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      const status = [401, 403, 429, 500, 502, 503, 504].includes(upstream.status) ? upstream.status : 502;
      return errorResponse(status, 'Certificate service request failed');
    }
    const data: unknown = JSON.parse(await boundedText(upstream, MAX_RESPONSE_BYTES));
    const parsed = endpoint === 'request-list'
      ? z.array(certificateListItemSchema).safeParse(data)
      : createCertificateResponseSchema.safeParse(data);
    if (!parsed.success) return errorResponse(502, 'Unexpected certificate service response');
    const output = JSON.stringify(parsed.data);
    // Even valid fields must not reflect an upstream credential or its URL.
    if (output.includes(apiKey) || output.includes(JSON.stringify(apiKey).slice(1, -1)) || /zalexinc\.azure-api\.net/i.test(output)) {
      return errorResponse(502, 'Unexpected certificate service response');
    }
    return new Response(output, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return controller.signal.aborted
      ? errorResponse(504, 'Certificate service timed out')
      : errorResponse(502, 'Certificate service unavailable');
  } finally { clearTimeout(timeout); }
}
