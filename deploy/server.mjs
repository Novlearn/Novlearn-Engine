// Trusted HTTP supervisor. The official host sanitizes each worker's environment.
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createNodeHost } from 'novlearn-exercise-engine/node-host';

export function createEngineServer({ token, identity, host }) {
  if (
    !/^[a-f0-9]{64}$/.test(token) ||
    !/^[a-f0-9]{64}$/.test(identity.archiveSha256)
  )
    throw new Error('Engine server configuration is incomplete.');
  const expected = Buffer.from(`Bearer ${token}`);
  const server = createServer(async (req, res) => {
    const reply = (status, value) => {
      if (res.destroyed) return;
      res.writeHead(status, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'x-engine-archive-sha256': identity.archiveSha256,
      });
      res.end(JSON.stringify(value));
    };
    const supplied = Buffer.from(req.headers.authorization ?? '');
    if (
      req.headers.origin ||
      supplied.length !== expected.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      reply(401, { error: 'Unauthorized' });
      req.resume();
      return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      reply(200, {
        version: identity.packageVersion,
        archiveSha256: identity.archiveSha256,
      });
      return;
    }
    if (req.method !== 'POST' || req.url !== '/run') {
      reply(404, { error: 'Not found' });
      req.resume();
      return;
    }
    if (req.headers['x-engine-archive-sha256'] !== identity.archiveSha256) {
      reply(409, { error: 'Engine archive mismatch' });
      req.resume();
      return;
    }
    if (req.headers['content-type'] !== 'application/json') {
      reply(415, { error: 'JSON required' });
      req.resume();
      return;
    }
    const controller = new AbortController();
    res.once('close', () => {
      if (!res.writableFinished) controller.abort();
    });
    req.once('aborted', () => controller.abort());
    let bytes = 0;
    const chunks = [];
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 1048576) {
          reply(413, { error: 'Input limit' });
          return;
        }
        chunks.push(chunk);
      }
      const result = await host.run(Buffer.concat(chunks).toString('utf8'), {
        signal: controller.signal,
      });
      reply(200, result);
    } catch {
      reply(503, { error: 'Engine unavailable' });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 5000;
  server.maxConnections = 16;
  return server;
}

if (
  process.argv[1] &&
  new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1') ===
    process.argv[1].replaceAll('\\', '/')
) {
  const identity = JSON.parse(
    await readFile(new URL('./engine-release.json', import.meta.url), 'utf8'),
  );
  // Refuse an unbounded Linux service before exposing a health endpoint.
  for (const [name, expected] of [
    ['memory.max', '402653184'],
    ['memory.swap.max', '0'],
    ['pids.max', '64'],
  ]) {
    if ((await readFile('/sys/fs/cgroup/' + name, 'utf8')).trim() !== expected)
      throw new Error('Engine cgroup profile mismatch.');
  }
  const host = createNodeHost({ maxConcurrent: 1, maxQueued: 4 });
  const server = createEngineServer({
    token: process.env.ENGINE_TOKEN ?? '',
    identity,
    host,
  });
  server.listen(3151, '0.0.0.0');
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, () => {
      server.close();
      void host.close();
    });
}
