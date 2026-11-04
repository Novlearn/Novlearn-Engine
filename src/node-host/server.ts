#!/usr/bin/env node
import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { createNodeHost } from './index.js';
import type { NodeHost } from './executor.js';

const maxBodyBytes = 1048576;
const apiPath = '/run';
const healthPath = '/healthz';
const archiveHeader = 'x-engine-archive-sha256';

function equalToken(actual: string | undefined, expected: Buffer): boolean {
  if (!actual) return false;
  const supplied = Buffer.from(actual, 'utf8');
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

function send(
  response: import('node:http').ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  response.end(payload);
}

/** Private HTTP adapter for trusted application backends. Never expose to browsers. */
export function createEngineHttpServer(
  host: NodeHost,
  token: string,
  archiveSha256: string,
  isReady: () => boolean = () => true,
) {
  const expected = Buffer.from(token, 'utf8');
  if (expected.length < 32) throw new Error('Invalid host configuration.');
  if (!/^[a-f0-9]{64}$/.test(archiveSha256))
    throw new Error('Invalid Engine archive identity.');
  const archiveResponseHeader = { [archiveHeader]: archiveSha256 };

  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url === healthPath) {
      const stats = host.stats();
      const ready = !stats.closed && isReady();
      send(response, ready ? 200 : 503, {
        status: ready ? 'ok' : 'unavailable',
        service: 'novlearn-engine-host',
        protocolVersion: 1,
      });
      return;
    }

    if (request.method !== 'POST' || request.url !== apiPath) {
      send(response, 404, { error: 'not-found' });
      return;
    }

    const authorization = request.headers.authorization;
    const bearer =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : undefined;
    if (!equalToken(bearer, expected)) {
      send(response, 401, { error: 'unauthorized' }, archiveResponseHeader);
      request.resume();
      return;
    }
    if (request.headers[archiveHeader] !== archiveSha256) {
      send(response, 409, { error: 'archive-mismatch' }, archiveResponseHeader);
      request.resume();
      return;
    }
    if (
      request.headers['content-type']?.split(';', 1)[0]?.trim() !==
      'application/json'
    ) {
      send(
        response,
        415,
        { error: 'unsupported-media-type' },
        archiveResponseHeader,
      );
      request.resume();
      return;
    }

    const chunks: Buffer[] = [];
    let byteCount = 0;
    let rejected = false;
    request.on('data', (chunk: Buffer | string) => {
      if (rejected) return;
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteCount += data.length;
      if (byteCount > maxBodyBytes) {
        rejected = true;
        send(response, 413, { error: 'input-limit' }, archiveResponseHeader);
        request.resume();
        return;
      }
      chunks.push(data);
    });
    request.on('end', () => {
      if (rejected) return;
      const body = Buffer.concat(chunks).toString('utf8');
      const abort = new AbortController();
      response.on('close', () => {
        if (!response.writableEnded) abort.abort();
      });
      void host
        .run(body, { signal: abort.signal })
        .then((result) => {
          if (response.destroyed) return;
          if (result.ok) send(response, 200, result, archiveResponseHeader);
          else if (result.error === 'busy')
            send(response, 429, result, archiveResponseHeader);
          else if (result.error === 'timeout')
            send(response, 504, result, archiveResponseHeader);
          else if (
            result.error === 'unavailable' ||
            result.error === 'crash' ||
            result.error === 'closed'
          )
            send(response, 503, result, archiveResponseHeader);
          else send(response, 400, result, archiveResponseHeader);
        })
        .catch(() => {
          if (!response.destroyed && !response.headersSent)
            send(
              response,
              503,
              { error: 'unavailable' },
              archiveResponseHeader,
            );
        });
    });
  });
  server.maxConnections = 16;
  server.headersTimeout = 5000;
  server.requestTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 100;
  return server;
}

function requiredToken(): string {
  const token = process.env.ENGINE_API_TOKEN;
  if (!token || Buffer.byteLength(token, 'utf8') < 32)
    throw new Error('ENGINE_API_TOKEN must contain at least 32 UTF-8 bytes.');
  return token;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.PORT ?? '8080');
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be a valid TCP port.');

  const archiveSha256 = process.env.ENGINE_ARTIFACT_SHA256;
  if (!archiveSha256) throw new Error('ENGINE_ARTIFACT_SHA256 is required.');
  const host = createNodeHost({ memoryMiB: 384, heapMiB: 128 });
  let ready = false;
  const server = createEngineHttpServer(
    host,
    requiredToken(),
    archiveSha256,
    () => ready,
  );
  server.listen(port, '0.0.0.0');
  void host
    .run(
      JSON.stringify({
        protocolVersion: 1,
        requestId: 'startup',
        operation: 'parseMathInput',
        payload: { source: '1', context: {}, profile: 'scalar-latex-v1' },
      }),
    )
    .then((result) => {
      ready = result.ok;
    })
    .catch(() => {
      ready = false;
    });

  let closing = false;
  function close(): void {
    if (closing) return;
    closing = true;
    server.close(() => {
      void host.close().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGTERM', close);
  process.on('SIGINT', close);
}
