import worker from '../../cloudflare/worker.js';

export async function onRequest(context: any): Promise<Response> {
  return worker.fetch(context.request, context.env, context);
}
