import { Readable } from 'node:stream';
import type { Plugin } from 'vite';
import { errorResponse, proxyCertificate } from './certificateProxy.ts';

export function certificateDevProxy(apiKey: string | undefined): Plugin {
  return {
    name: 'certificate-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (!path?.startsWith('/api/')) return next();
        let response: Response;
        try {
          if (path !== '/api/request-list' && path !== '/api/request-certificate') {
            response = errorResponse(404, 'API endpoint not found');
          } else {
            const headers = new Headers();
            for (const name of ['content-type', 'content-length', 'x-client-timezone']) {
              const value = req.headers[name];
              if (typeof value === 'string') headers.set(name, value);
            }
            const method = req.method ?? 'GET';
            const init: RequestInit & { duplex?: 'half' } = { method, headers };
            if (method !== 'GET' && method !== 'HEAD') {
              init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
              init.duplex = 'half';
            }
            response = await proxyCertificate(new Request(`http://localhost${path}`, init),
              path === '/api/request-list' ? 'request-list' : 'request-certificate', apiKey);
          }
        } catch { response = errorResponse(500, 'Certificate service unavailable'); }
        res.statusCode = response.status;
        response.headers.forEach((value, name) => res.setHeader(name, value));
        res.end(await response.text());
      });
    },
  };
}
