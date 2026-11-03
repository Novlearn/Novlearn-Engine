import { Buffer } from 'node:buffer';
import type { NodeHost, HostResult, HostError } from '../node-host/executor.js';
import { boundedJson, object, request } from '../node-host/protocol.js';

export type RemoteHostConfiguration = {
  url: string;
  token: string;
  archiveSha256: string;
};

/** Explicit server-only transport. It never evaluates mathematics or chooses a database. */
export function createRemoteHost(
  configuration: RemoteHostConfiguration,
): NodeHost {
  const url = new URL(configuration.url);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/run' ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      )) ||
    !/^[a-f0-9]{64}$/.test(configuration.token) ||
    !/^[a-f0-9]{64}$/.test(configuration.archiveSha256)
  )
    throw new TypeError('Invalid private Engine transport configuration.');
  const controllers = new Set<AbortController>();
  let closed = false;
  const failure = (requestId: string | null, error: HostError): HostResult => ({
    requestId,
    ok: false,
    error,
    metrics: { elapsedMs: 0, queuedMs: 0 },
  });
  return {
    async run(json, options = {}) {
      let id: string | null = null;
      try {
        if (closed) return failure(id, 'closed');
        if (options.signal?.aborted) return failure(id, 'aborted');
        if (Buffer.byteLength(json) > 1048576)
          return failure(id, 'input-limit');
        const input: unknown = JSON.parse(json);
        if (!boundedJson(input) || !request(input))
          return failure(id, 'invalid-request');
        id = input.requestId;
        if (controllers.size >= 5) return failure(id, 'busy');
        const controller = new AbortController();
        controllers.add(controller);
        const signal = AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(10000),
          ...(options.signal ? [options.signal] : []),
        ]);
        try {
          const response = await fetch(url, {
            method: 'POST',
            body: json,
            redirect: 'error',
            cache: 'no-store',
            signal,
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${configuration.token}`,
              'x-engine-archive-sha256': configuration.archiveSha256,
            },
          });
          if (
            response.headers.get('x-engine-archive-sha256') !==
            configuration.archiveSha256
          )
            return failure(id, 'protocol-error');
          if (!response.ok || !response.body)
            return failure(
              id,
              response.status === 429 ? 'busy' : 'unavailable',
            );
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let bytes = 0;
          try {
            for (;;) {
              const next = await reader.read();
              if (next.done) break;
              bytes += next.value.byteLength;
              if (bytes > 2099200) return failure(id, 'output-limit');
              chunks.push(next.value);
            }
          } finally {
            await reader.cancel();
          }
          const result: unknown = JSON.parse(
            Buffer.concat(chunks).toString('utf8'),
          );
          if (
            !object(result) ||
            result.requestId !== id ||
            !object(result.metrics) ||
            !Number.isFinite(result.metrics.elapsedMs) ||
            !Number.isFinite(result.metrics.queuedMs)
          )
            return failure(id, 'protocol-error');
          if (result.ok === true && Object.hasOwn(result, 'value'))
            return result as unknown as HostResult;
          const errors: HostError[] = [
            'invalid-request',
            'input-limit',
            'output-limit',
            'stderr-limit',
            'busy',
            'timeout',
            'aborted',
            'closed',
            'unavailable',
            'crash',
            'protocol-error',
            'worker-error',
          ];
          if (result.ok === false && errors.includes(result.error as HostError))
            return result as unknown as HostResult;
          return failure(id, 'protocol-error');
        } finally {
          controllers.delete(controller);
        }
      } catch {
        return failure(id, options.signal?.aborted ? 'aborted' : 'unavailable');
      }
    },
    async close() {
      closed = true;
      for (const controller of controllers) controller.abort();
    },
    stats() {
      return { active: controllers.size, queued: 0, queuedBytes: 0, closed };
    },
  };
}
