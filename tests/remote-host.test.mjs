import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createRemoteHost } from 'novlearn-exercise-engine/remote-host';
import { createEngineServer } from '../deploy/server.mjs';

const token = 'a'.repeat(64),
  sha = 'b'.repeat(64);
const request = () =>
  JSON.stringify({
    protocolVersion: 1,
    requestId: randomUUID(),
    operation: 'validateDefinition',
    payload: { definition: {} },
  });
const success = (id) => ({
  requestId: id,
  ok: true,
  value: { ok: false },
  metrics: { elapsedMs: 1, queuedMs: 0 },
});
afterEach(() => vi.unstubAllGlobals());

describe('private transport configuration and identity', () => {
  it.each([
    'http://engine.example/run',
    'https://user:password@engine.example/run',
    'https://engine.example/run?token=x',
    'https://engine.example/run#x',
    'https://engine.example/other',
  ])('refuses an unsafe endpoint %s', (url) => {
    expect(() =>
      createRemoteHost({ url, token, archiveSha256: sha }),
    ).toThrow();
  });
  it('checks release identity and request correlation before trusting a response', async () => {
    const client = createRemoteHost({
      url: 'https://engine.example/run',
      token,
      archiveSha256: sha,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (_url, init) =>
          new Response(
            JSON.stringify(success(JSON.parse(init.body).requestId)),
            { headers: { 'x-engine-archive-sha256': 'c'.repeat(64) } },
          ),
      ),
    );
    expect((await client.run(request())).error).toBe('protocol-error');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(success('other-request')), {
            headers: { 'x-engine-archive-sha256': sha },
          }),
      ),
    );
    expect((await client.run(request())).error).toBe('protocol-error');
  });
  it('bounds request and response sizes and rejects malformed envelopes', async () => {
    const client = createRemoteHost({
      url: 'https://engine.example/run',
      token,
      archiveSha256: sha,
    });
    const fetch = vi.fn(
      async () =>
        new Response('x'.repeat(2099201), {
          headers: { 'x-engine-archive-sha256': sha },
        }),
    );
    vi.stubGlobal('fetch', fetch);
    expect((await client.run('{}')).error).toBe('invalid-request');
    expect((await client.run('x'.repeat(1048577))).error).toBe('input-limit');
    expect(fetch).not.toHaveBeenCalled();
    expect((await client.run(request())).error).toBe('output-limit');
  });
  it('cancels in-flight transport and refuses work after closing', async () => {
    const client = createRemoteHost({
      url: 'https://engine.example/run',
      token,
      archiveSha256: sha,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (_url, init) =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener(
              'abort',
              () => reject(new Error('aborted')),
              { once: true },
            ),
          ),
      ),
    );
    const controller = new AbortController();
    const pending = client.run(request(), { signal: controller.signal });
    controller.abort();
    expect((await pending).error).toBe('aborted');
    await client.close();
    expect((await client.run(request())).error).toBe('closed');
  });
});

describe('HTTP supervisor with an injected host', () => {
  it('authenticates, refuses browser traffic and wrong archives, then transports a result', async () => {
    const calls = [];
    const host = {
      run: async (body) => {
        calls.push(body);
        return success(JSON.parse(body).requestId);
      },
    };
    const server = createEngineServer({
      token,
      identity: { packageVersion: '0.2.0', archiveSha256: sha },
      host,
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}/run`;
    try {
      expect((await fetch(url, { method: 'POST', body: '{}' })).status).toBe(
        401,
      );
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${token}`,
              origin: 'https://browser.example',
            },
            body: '{}',
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${token}`,
              'content-type': 'application/json',
              'x-engine-archive-sha256': 'c'.repeat(64),
            },
            body: request(),
          })
        ).status,
      ).toBe(409);
      expect(calls).toHaveLength(0);
      const client = createRemoteHost({ url, token, archiveSha256: sha });
      expect((await client.run(request())).ok).toBe(true);
      expect(calls).toHaveLength(1);
      const health = await fetch(url.replace('/run', '/health'), {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(await health.json()).toEqual({
        version: '0.2.0',
        archiveSha256: sha,
      });
      await client.close();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
