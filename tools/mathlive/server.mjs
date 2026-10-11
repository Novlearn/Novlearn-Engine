// Local input bench only; no grading or official exercise data are served.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const base = new URL('./', import.meta.url);
const origin = 'http://127.0.0.1:4317';
const types = {
  '.html': 'text/html',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wav': 'audio/wav',
};
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'",
  );
  try {
    if (
      request.method === 'POST' &&
      request.url === '/capture' &&
      request.headers.origin === origin &&
      request.headers['content-type'] === 'application/json'
    ) {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 131072) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      const capture = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (
        capture.schemaVersion !== 1 ||
        capture.mathliveVersion !== '0.111.1' ||
        !Array.isArray(capture.records) ||
        capture.records.length > 128
      ) {
        response.writeHead(400).end();
        return;
      }
      await mkdir(new URL('../../.cache/', base), { recursive: true });
      await writeFile(
        new URL('../../.cache/mathlive-observed.json', base),
        JSON.stringify(capture, null, 2) + '\n',
        'utf8',
      );
      response
        .writeHead(200, { 'Content-Type': 'text/plain' })
        .end(`Saved ${capture.records.length} observations locally.`);
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405).end();
      return;
    }
    const path = new URL(request.url, origin).pathname;
    let file;
    if (path === '/') file = new URL('index.html', base);
    else if (['/bench.mjs', '/cases.json'].includes(path))
      file = new URL(path.slice(1), base);
    else if (
      /^\/mathlive\/[a-zA-Z0-9_./-]+$/.test(path) &&
      !path.includes('..')
    )
      file = new URL(`node_modules${path}`, base);
    else {
      response.writeHead(404).end();
      return;
    }
    const suffix = file.pathname.slice(file.pathname.lastIndexOf('.'));
    response
      .writeHead(200, {
        'Content-Type': `${types[suffix] ?? 'application/octet-stream'}; charset=utf-8`,
      })
      .end(await readFile(file));
  } catch {
    response.writeHead(404).end('Not found or malformed capture.');
  }
});
server.listen(4317, '127.0.0.1', () =>
  console.log(`MathLive input bench: ${origin}`),
);
