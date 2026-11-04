import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createRemoteHost } from 'novlearn-exercise-engine/remote-host';

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
