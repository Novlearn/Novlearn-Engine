import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(
  await readFile(
    join(root, 'releases/0.2.0/engine-release-0.2.0.json'),
    'utf8',
  ),
);
const vendor = join(root, 'deploy/vendor');
await mkdir(vendor, { recursive: true });
const archive = join(root, 'releases/0.2.0', manifest.archive);
assert.equal(
  createHash('sha256')
    .update(await readFile(archive))
    .digest('hex'),
  manifest.archiveSha256,
);
await copyFile(archive, join(vendor, 'engine.tgz'));
const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const executable = process.platform === 'win32' ? process.execPath : 'npm';
const prefix = process.platform === 'win32' ? [npm] : [];
for (const [name, target] of [
  ['@cortex-js/compute-engine', 'cortex.tgz'],
  ['@arnog/colors', 'colors.tgz'],
  ['complex.js', 'complex.tgz'],
]) {
  const installed = join(root, 'node_modules', name);
  const pkg = JSON.parse(
    await readFile(join(installed, 'package.json'), 'utf8'),
  );
  assert.equal(pkg.version, manifest.dependencies[name]);
  const output = execFileSync(
    executable,
    [
      ...prefix,
      'pack',
      '--offline',
      '--ignore-scripts',
      '--json',
      '--cache',
      join(root, '.cache/image-npm-cache'),
      '--pack-destination',
      vendor,
      installed,
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  const packed = JSON.parse(output)[0];
  assert.equal(packed.name, name);
  assert.equal(packed.version, manifest.dependencies[name]);
  await copyFile(join(vendor, packed.filename), join(vendor, target));
}
console.log(
  'PASS: exact Engine archive and locked dependencies prepared for an offline image build.',
);
