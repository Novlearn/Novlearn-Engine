import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createEngineHttpServer } from '../src/node-host/server.js';
import type { NodeHost } from '../src/node-host/executor.js';

const token = 't'.repeat(48);
const archiveSha256 = 'a'.repeat(64);

function harness(isReady: () => boolean = () => true) {
  const calls: string[] = [];
  const host: NodeHost = {
    run: async (json) => {
      calls.push(json);
      const request = JSON.parse(json) as { requestId: string };
      return {
        requestId: request.requestId,
        ok: true,
        value: null,
        metrics: { elapsedMs: 1, queuedMs: 0 },
      };
    },
    close: async () => {},
    stats: () => ({ active: 0, queued: 0, queuedBytes: 0, closed: false }),
  };
  return {
    server: createEngineHttpServer(host, token, archiveSha256, isReady),
    calls,
  };
}

async function dispatch(
  server: ReturnType<typeof createEngineHttpServer>,
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: string,
): Promise<{
  status: number;
  body: unknown;
  headers: Record<string, string | number>;
}> {
  const request = Object.assign(new EventEmitter(), {
    method,
    url,
    headers,
    resume: () => {},
  });
  let status = 0;
  let headersSent = false;
  let responseHeaders: Record<string, string | number> = {};
  return new Promise((resolve) => {
    let writableEnded = false;
    const response = Object.assign(new EventEmitter(), {
      destroyed: false,
      get writableEnded() {
        return writableEnded;
      },
      get headersSent() {
        return headersSent;
      },
      writeHead(code: number, headers: Record<string, string | number>) {
        status = code;
        responseHeaders = headers;
        headersSent = true;
      },
      end(payload: string) {
        writableEnded = true;
        resolve({
          status,
          body: JSON.parse(payload) as unknown,
          headers: responseHeaders,
        });
      },
    });
    server.emit(
      'request',
      request as unknown as IncomingMessage,
      response as unknown as ServerResponse,
    );
    queueMicrotask(() => {
      if (body !== undefined) request.emit('data', Buffer.from(body));
      request.emit('end');
    });
  });
}

describe('private Engine HTTP adapter', () => {
  it('provides a minimal health response without the token', async () => {
    const { server } = harness();
    const response = await dispatch(server, 'GET', '/healthz');
    expect(response).toMatchObject({
      status: 200,
      body: {
        status: 'ok',
        service: 'novlearn-engine-host',
        protocolVersion: 1,
      },
    });
  });

  it('reports unready until the isolated worker probe succeeds', async () => {
    const { server } = harness(() => false);
    const response = await dispatch(server, 'GET', '/healthz');
    expect(response.status).toBe(503);
  });

  it('rejects missing and incorrect tokens before reading math input', async () => {
    const { server, calls } = harness();
    const body = JSON.stringify({ requestId: 'a' });
    const missing = await dispatch(
      server,
      'POST',
      '/run',
      {
        'content-type': 'application/json',
      },
      body,
    );
    const wrong = await dispatch(
      server,
      'POST',
      '/run',
      {
        'content-type': 'application/json',
        authorization: `Bearer ${'x'.repeat(token.length)}`,
      },
      body,
    );
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it('passes the versioned request unchanged to the private host', async () => {
    const { server, calls } = harness();
    const body = JSON.stringify({
      protocolVersion: 1,
      requestId: 'req_1',
      operation: 'validateDefinition',
      payload: {},
    });
    const response = await dispatch(
      server,
      'POST',
      '/run',
      {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-engine-archive-sha256': archiveSha256,
      },
      body,
    );
    expect(response.status).toBe(200);
    expect(response.headers['x-engine-archive-sha256']).toBe(archiveSha256);
    expect(calls).toEqual([body]);
    expect(response.body).toMatchObject({ requestId: 'req_1', ok: true });
  });

  it('rejects non-JSON and oversized request bodies', async () => {
    const { server, calls } = harness();
    const auth = { authorization: `Bearer ${token}` };
    const media = await dispatch(
      server,
      'POST',
      '/run',
      {
        ...auth,
        'content-type': 'text/plain',
        'x-engine-archive-sha256': archiveSha256,
      },
      'nope',
    );
    const large = await dispatch(
      server,
      'POST',
      '/run',
      {
        ...auth,
        'content-type': 'application/json',
        'x-engine-archive-sha256': archiveSha256,
      },
      ' '.repeat(1048577),
    );
    expect(media.status).toBe(415);
    expect(large.status).toBe(413);
    expect(calls).toEqual([]);
  });

  it('requires a sufficiently long independent server token', () => {
    expect(() =>
      createEngineHttpServer({} as NodeHost, 'short', archiveSha256),
    ).toThrow('Invalid host configuration.');
  });

  it('rejects a client pinned to a different Engine archive', async () => {
    const { server, calls } = harness();
    const response = await dispatch(
      server,
      'POST',
      '/run',
      {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-engine-archive-sha256': 'b'.repeat(64),
      },
      JSON.stringify({
        protocolVersion: 1,
        requestId: 'req_2',
        operation: 'validateDefinition',
        payload: {},
      }),
    );
    expect(response.status).toBe(409);
    expect(response.headers['x-engine-archive-sha256']).toBe(archiveSha256);
    expect(calls).toEqual([]);
  });
});
