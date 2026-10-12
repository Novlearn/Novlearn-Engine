/** Ephemeral static-only browser proof. No engine operation, private data or arbitrary file route. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const bundle = await readFile(resolve(process.argv[2]));
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Consommateur navigateur du tarball</title><h1>Consommateur navigateur du tarball</h1><p>Archive installée, bundle Rolldown platform browser, aucun builtin Node.</p><pre id="result">Chargement</pre><script type="module" src="/proof.mjs"></script></html>`;
const script = `import {result} from '/bundle.mjs'; document.querySelector('#result').textContent=JSON.stringify(result,null,2);`;
createServer((request, response) => {
  const routes = {
    '/': ['text/html; charset=utf-8', html],
    '/proof.mjs': ['text/javascript; charset=utf-8', script],
    '/bundle.mjs': ['text/javascript; charset=utf-8', bundle],
  };
  const route = routes[request.url];
  if (request.method !== 'GET' || !route) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': route[0],
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'",
  });
  response.end(route[1]);
}).listen(4319, '127.0.0.1', () =>
  console.log('Static browser proof: http://127.0.0.1:4319/'),
);
