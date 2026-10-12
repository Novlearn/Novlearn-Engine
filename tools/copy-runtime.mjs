import { cp, mkdir, realpath, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve, sep } from 'node:path';
import process from 'node:process';
// Remove obsolete generated launcher assets (the discarded launch.ps1 was
// observed in a dry-run tarball). Verify the absolute real target before rm.
const project = await realpath(new URL('../', import.meta.url));
const target = resolve(project, 'dist/node-host/windows');
const parent = await realpath(new URL('../dist/node-host/', import.meta.url));
let actual = target;
try {
  actual = await realpath(target);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (
  !target.startsWith(project + sep) ||
  parent.toLowerCase() !== resolve(project, 'dist/node-host').toLowerCase() ||
  actual.toLowerCase() !== target.toLowerCase()
)
  throw new Error(
    'Refusing to clean a launcher directory outside its generated target.',
  );
await rm(actual, { recursive: true, force: true });
await mkdir(new URL('../dist/node-host/windows/', import.meta.url), {
  recursive: true,
});
await cp(
  new URL('../runtime/windows/', import.meta.url),
  new URL('../dist/node-host/windows/', import.meta.url),
  { recursive: true },
);
await mkdir(new URL('../dist/node-host/linux/', import.meta.url), {
  recursive: true,
});
await cp(
  new URL('../runtime/linux/', import.meta.url),
  new URL('../dist/node-host/linux/', import.meta.url),
  { recursive: true },
);
if (process.platform === 'win32' && process.arch === 'x64') {
  const compiler = join(
    process.env.SystemRoot ?? 'C:/Windows',
    'Microsoft.NET/Framework64/v4.0.30319/csc.exe',
  );
  const compiled = spawnSync(
    compiler,
    [
      '/nologo',
      '/target:exe',
      '/optimize+',
      `/out:${fileURLToPath(new URL('../dist/node-host/windows/job.exe', import.meta.url))}`,
      fileURLToPath(new URL('../runtime/windows/job.cs', import.meta.url)),
    ],
    { windowsHide: true, stdio: 'inherit' },
  );
  if (compiled.status !== 0)
    throw new Error('Windows job launcher compilation failed.');
}
