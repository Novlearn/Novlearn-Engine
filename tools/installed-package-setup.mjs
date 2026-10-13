import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, writeFile } from 'node:fs/promises';
await writeFile(
  '/consumer/package.json',
  JSON.stringify({
    name: 'engine-linux-consumer',
    private: true,
    type: 'module',
  }),
);
const installed = spawnSync(
  process.execPath,
  [
    '/usr/local/lib/node_modules/npm/bin/npm-cli.js',
    'install',
    '--offline',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--cache',
    '/consumer/npm-cache',
    '/archives/engine.tgz',
    '/archives/cortex.tgz',
    '/archives/colors.tgz',
    '/archives/complex.tgz',
  ],
  { cwd: '/consumer', encoding: 'utf8', timeout: 120000, maxBuffer: 1048576 },
);
assert.equal(installed.status, 0, installed.stderr || installed.stdout);
await copyFile('/inputs/consumer.mjs', '/consumer/smoke.mjs');
const tested = spawnSync(process.execPath, ['/consumer/smoke.mjs'], {
  cwd: '/consumer',
  encoding: 'utf8',
  timeout: 120000,
  maxBuffer: 1048576,
});
process.stdout.write(tested.stdout);
process.stderr.write(tested.stderr);
assert.equal(tested.status, 0, tested.stderr);
