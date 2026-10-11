// Trusted test fixture only. No public chaos operation or configurable worker path.
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
const reply = (value) =>
  JSON.stringify({
    protocolVersion: 1,
    requestId: request.requestId,
    ok: true,
    value,
  });
const mode = request.payload.mode;
if (mode === 'hang') {
  mkdirSync(new URL('../../../.cache/', import.meta.url), { recursive: true });
  writeFileSync(
    new URL('../../../.cache/isolation-entered.json', import.meta.url),
    JSON.stringify({ pid: process.pid, launcherPid: process.ppid }),
  );
  // Report a tempting success, then genuinely block synchronously forever.
  process.stdout.write(reply({ entered: true }) + '\n', () => {
    for (;;) {
      /* CPU, no asynchronous cancellation possible here. */
    }
  });
} else if (mode === 'buffer') {
  const held = [];
  let allocated = 0;
  try {
    for (;;) {
      held.push(Buffer.alloc(16 * 1048576, 1));
      allocated += 16 * 1048576;
    }
  } catch {
    process.stdout.write(
      reply({
        denied: true,
        allocated,
        external: process.memoryUsage().external,
      }) + '\n',
    );
  }
} else if (mode === 'heap') {
  const held = [];
  for (;;) held.push(new Array(262144).fill('heap'));
} else if (mode === 'crash') process.exit(9);
else if (mode === 'bad-json') process.stdout.write('{oops\n');
else if (mode === 'double')
  process.stdout.write(reply(1) + '\n' + reply(2) + '\n');
else if (mode === 'wrong-id')
  process.stdout.write(
    JSON.stringify({
      protocolVersion: 1,
      requestId: 'wrong',
      ok: true,
      value: 1,
    }) + '\n',
  );
else if (mode === 'no-newline') process.stdout.write(reply(1));
else if (mode === 'stdout') process.stdout.write('x'.repeat(65536));
else if (mode === 'stderr') process.stderr.write('x'.repeat(65536));
else if (mode === 'child') {
  try {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
      windowsHide: true,
    });
    child.on('error', () =>
      process.stdout.write(reply({ childBlocked: true }) + '\n'),
    );
    child.on('spawn', () => {
      child.kill('SIGKILL');
      process.stdout.write(reply({ childBlocked: false }) + '\n');
    });
  } catch {
    process.stdout.write(reply({ childBlocked: true }) + '\n');
  }
} else if (mode === 'environment') {
  process.stdout.write(
    reply({
      nodeOptions: process.env.NODE_OPTIONS ?? null,
      nodePath: process.env.NODE_PATH ?? null,
      secret: process.env.NOVLEARN_TEST_SECRET ?? null,
    }) + '\n',
  );
} else if (mode === 'delay')
  setTimeout(
    () => process.stdout.write(reply(request.payload.value ?? 1) + '\n'),
    300,
  );
else process.stdout.write(reply(request.payload.value ?? 1) + '\n');
