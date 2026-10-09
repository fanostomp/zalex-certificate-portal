import { proxyCertificate } from '../server/certificateProxy.ts';

export default {
  fetch(request: Request): Promise<Response> {
    return proxyCertificate(request, 'request-list');
  },
};
