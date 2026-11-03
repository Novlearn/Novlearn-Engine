import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(
  await readFile(new URL('./engine-release.json', import.meta.url), 'utf8'),
);
const archive = await readFile('/archives/engine.tgz');
assert.equal(
  createHash('sha256').update(archive).digest('hex'),
  manifest.archiveSha256,
);
for (const [name, expected] of Object.entries(manifest.files)) {
  assert(
    !name.split('/').some((part) => !part || part === '.' || part === '..'),
  );
  const bytes = await readFile(
    new URL('./node_modules/novlearn-exercise-engine/' + name, import.meta.url),
  );
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    expected,
    name,
  );
}
console.log('PASS: installed Engine files match the release manifest.');
