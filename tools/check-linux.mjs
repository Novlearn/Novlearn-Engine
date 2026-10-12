// Explicit Linux integration check; run only in a dedicated bounded cgroup.
import assert from 'node:assert/strict';
import process from 'node:process';
import { readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { createNodeHost } from '../dist/node-host/index.js';
import { createExecutor } from '../dist/node-host/executor.js';
assert.equal(process.platform, 'linux');
const fixture = new URL('../tests/fixtures/runtime/chaos.mjs', import.meta.url);
const marker = new URL('../.cache/isolation-entered.json', import.meta.url);
let next = 0,
  checks = 0;
const encoded = (mode = 'echo') =>
  JSON.stringify({
    protocolVersion: 1,
    requestId: 'linux' + ++next,
    operation: 'validateDefinition',
    payload: { mode },
  });
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
async function until(test) {
  const deadline = performance.now() + 5000;
  while (!test()) {
    assert.ok(performance.now() < deadline, 'Observation deadline');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
function observe() {
  try {
    return JSON.parse(readFileSync(marker, 'utf8'));
  } catch {
    return null;
  }
}
async function withHost(options, test) {
  const host = createExecutor(fixture, options);
  try {
    await test(host);
    checks++;
  } finally {
    await host.close();
  }
  assert.deepEqual(host.stats(), {
    active: 0,
    queued: 0,
    queuedBytes: 0,
    closed: true,
  });
}
const real = createNodeHost();
try {
  const result = await real.run(
    JSON.stringify({
      protocolVersion: 1,
      requestId: 'math',
      operation: 'parseMathInput',
      payload: {
        source: ' x+1 ',
        context: { variables: ['x'] },
        profile: 'scalar-latex-v1',
      },
    }),
  );
  if (process.argv[2] === '--unavailable') {
    assert.equal(result.error, 'unavailable');
    assert.equal(result.metrics.workerPid, undefined);
    console.log(
      JSON.stringify({ linuxCheck: 'unbounded-scope-refused', passed: 1 }),
    );
    await real.close();
    process.exit(0);
  }
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.source, ' x+1 ');
  assert.ok(result.metrics.peakCgroupBytes > 0);
  assert.equal(result.metrics.peakCommittedBytes, undefined);
  checks++;
} finally {
  await real.close();
}
await withHost({}, async (host) => {
  const result = await host.run(encoded('child'));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.childBlocked, true);
});
await withHost({ timeoutMs: 800 }, async (host) => {
  rmSync(marker, { force: true });
  const promise = host.run(encoded('hang'));
  await until(() => observe() !== null);
  const pid = observe().pid;
  const end = performance.now() + 1500;
  while (performance.now() < end) {
    /* deliberately stall the supervisor */
  }
  assert.equal(
    alive(pid),
    false,
    'Independent watchdog must kill before parent callback',
  );
  const result = await promise;
  assert.equal(result.error, 'timeout');
  await until(() => !alive(result.metrics.workerPid));
  assert.equal((await host.run(encoded())).ok, true);
});
await withHost({ heapMiB: 32, timeoutMs: 10000 }, async (host) => {
  const events = () =>
    Object.fromEntries(
      readFileSync('/sys/fs/cgroup/memory.events', 'utf8')
        .trim()
        .split('\n')
        .map((line) => {
          const [key, value] = line.split(' ');
          return [key, Number(value)];
        }),
    );
  const before = events();
  const result = await host.run(encoded('buffer'));
  assert.equal(result.ok, false, JSON.stringify(result));
  const after = events();
  assert.ok(
    ['crash', 'timeout'].includes(result.error),
    JSON.stringify(result),
  );
  assert.ok(
    after.max > before.max,
    'External Buffer pages must hit the OS cgroup quota',
  );
  console.log(
    JSON.stringify({
      externalMemoryPressure: {
        before,
        after,
        error: result.error,
        elapsedMs: result.metrics.elapsedMs,
        peakCgroupBytes: Number(
          readFileSync('/sys/fs/cgroup/memory.peak', 'utf8'),
        ),
      },
    }),
  );
  await until(() => !alive(result.metrics.workerPid));
  assert.equal((await host.run(encoded())).ok, true);
});
for (const mode of [
  'heap',
  'crash',
  'bad-json',
  'double',
  'wrong-id',
  'no-newline',
])
  await withHost({ heapMiB: 32 }, async (host) => {
    const result = await host.run(encoded(mode));
    assert.equal(result.ok, false, mode);
    const errors =
      mode === 'heap' ? ['crash', 'timeout'] : ['crash', 'protocol-error'];
    assert.ok(
      errors.includes(result.error),
      mode + ': ' + JSON.stringify(result),
    );
    if (result.metrics.workerPid)
      await until(() => !alive(result.metrics.workerPid));
    assert.equal((await host.run(encoded())).ok, true);
  });
await withHost({ maxOutputBytes: 4096, maxStderrBytes: 4096 }, async (host) => {
  assert.equal((await host.run(encoded('stdout'))).error, 'output-limit');
  assert.equal((await host.run(encoded('stderr'))).error, 'stderr-limit');
  assert.equal((await host.run(encoded())).ok, true);
});
rmSync(marker, { force: true });
const parent = spawn(process.execPath, [
  new URL('../tests/fixtures/runtime/parent.mjs', import.meta.url).pathname,
]);
parent.stdin.on('error', () => {});
const exited = new Promise((resolve) => parent.on('close', resolve));
try {
  await until(() => observe() !== null);
  const { pid, launcherPid } = observe();
  parent.kill('SIGKILL');
  await exited;
  await until(() => !alive(pid) && !alive(launcherPid));
  checks++;
} finally {
  if (parent.exitCode === null) parent.kill('SIGKILL');
}
console.log(
  JSON.stringify({
    linuxCheck: 'bounded-cgroup-v2',
    passed: checks,
    node: process.version,
    memoryMax: readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim(),
    swapMax: readFileSync('/sys/fs/cgroup/memory.swap.max', 'utf8').trim(),
    pidsMax: readFileSync('/sys/fs/cgroup/pids.max', 'utf8').trim(),
  }),
);
