import { describe, expect, it } from 'vitest';
import { createNodeHost } from 'novlearn-exercise-engine/node-host';
import { createExecutor } from '../dist/node-host/executor.js';
import { performance } from 'node:perf_hooks';
import { readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
const chaos = new URL('./fixtures/runtime/chaos.mjs', import.meta.url);
const marker = new URL('../.cache/isolation-entered.json', import.meta.url);
let next = 0;
const encoded = (mode = 'echo', value) =>
  JSON.stringify({
    protocolVersion: 1,
    requestId: `r${++next}`,
    operation: 'validateDefinition',
    payload: { mode, ...(value === undefined ? {} : { value }) },
  });
const parse = (id, source, context = {}) =>
  JSON.stringify({
    protocolVersion: 1,
    requestId: id,
    operation: 'parseMathInput',
    payload: { source, context, profile: 'scalar-latex-v1' },
  });
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
async function until(test, milliseconds = 5000) {
  const deadline = performance.now() + milliseconds;
  while (!test()) {
    if (performance.now() > deadline)
      throw new Error('Observation deadline exceeded.');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
const readMarker = () => {
  try {
    return JSON.parse(readFileSync(marker, 'utf8'));
  } catch {
    return null;
  }
};
async function withHost(options, test, entry = chaos) {
  const host = createExecutor(entry, options);
  try {
    await test(host);
  } finally {
    await host.close();
  }
  expect(host.stats()).toEqual({
    active: 0,
    queued: 0,
    queuedBytes: 0,
    closed: true,
  });
}
describe.skipIf(process.platform !== 'win32' || process.arch !== 'x64')(
  'Windows OS bounded Node host',
  () => {
    it('runs the real public engine, preserves raw source and isolates names', async () => {
      const host = createNodeHost();
      try {
        const first = await host.run(
          parse('real1', ' x + 1 ', { variables: ['x'] }),
        );
        expect(first.ok, JSON.stringify(first)).toBe(true);
        expect(first).toMatchObject({
          ok: true,
          value: { ok: true, source: ' x + 1 ', symbols: { variables: ['x'] } },
        });
        expect(first.metrics.peakCommittedBytes).toBeGreaterThan(0);
        expect(first.metrics.peakCommittedBytes).toBeLessThanOrEqual(
          384 * 1048576,
        );
        expect(alive(first.metrics.workerPid)).toBe(false);
        const second = await host.run(parse('real2', 'x+1'));
        expect(second).toMatchObject({
          ok: true,
          value: {
            ok: false,
            diagnostics: [expect.objectContaining({ code: 'unknown-symbol' })],
          },
        });
        expect(second.metrics.workerPid).not.toBe(first.metrics.workerPid);
      } finally {
        await host.close();
      }
    }, 15000);
    it('reports a native launch failure without paths or exception messages', async () => {
      const missingNode = fileURLToPath(
        new URL('./fixtures/runtime/missing-node.exe', import.meta.url),
      );
      const child = spawn(
        fileURLToPath(
          new URL('../dist/node-host/windows/job.exe', import.meta.url),
        ),
        [
          missingNode,
          fileURLToPath(chaos),
          '402653184',
          '128',
          '1048576',
          '5000',
        ],
        { windowsHide: true },
      );
      let stdout = '',
        stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8');
      });
      child.stdin.on('error', () => {});
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      try {
        const code = await new Promise((resolve, reject) => {
          child.on('error', reject);
          child.on('close', resolve);
        });
        expect(code).toBe(70);
        expect(stdout).toBe('');
        expect(stderr).toMatch(/^launcher-unavailable:2\r?\n$/);
      } finally {
        clearTimeout(timer);
        child.kill('SIGKILL');
      }
    });
    it('uses the seven public operations with an official private snapshot and deterministic replay', async () => {
      const definition = {
        schemaVersion: 5,
        kind: 'composed',
        id: 'synthetic-host',
        revision: '1',
        title: 'Host',
        generation: {
          schemaVersion: 5,
          definitions: [],
          constraints: [],
          maxAttempts: 1,
          maxDraws: 1,
        },
        variables: [],
        elements: [
          {
            id: 'q',
            type: 'question',
            text: 'Half',
            points: 1,
            response: { format: 'latex', kind: 'rational' },
            expectedLatex: '1/2',
            policy: { domain: 'rational', form: 'value-only' },
          },
        ],
      };
      const host = createNodeHost({ timeoutMs: 10000 });
      const send = async (operation, payload) => {
        const result = await host.run(
          JSON.stringify({
            protocolVersion: 1,
            requestId: `op${++next}`,
            operation,
            payload,
          }),
        );
        expect(result.ok, JSON.stringify(result)).toBe(true);
        return result.value;
      };
      try {
        expect(await send('validateDefinition', { definition })).toMatchObject({
          ok: true,
        });
        expect(
          await send('generateVariables', {
            definition: definition.generation,
            seed: 42,
          }),
        ).toMatchObject({ ok: true });
        const generated = await send('instantiateExercise', {
          definition,
          seed: 42,
          instanceId: 'official-host',
        });
        expect(generated.ok).toBe(true);
        const official = generated.value;
        const display = await send('projectPublicInstance', { official });
        expect(JSON.stringify(display)).not.toContain('expected');
        expect(JSON.stringify(display)).not.toContain('policy');
        const submission = {
          schemaVersion: 5,
          instanceId: official.instanceId,
          questionId: 'q',
          answer: { format: 'latex', source: '\\frac{2}{4}' },
        };
        expect(await send('validateSubmission', { submission })).toMatchObject({
          ok: true,
        });
        expect(
          await send('gradeAnswer', { official, submission }),
        ).toMatchObject({ state: 'correct' });
        expect(
          await send('instantiateExercise', {
            definition,
            seed: 42,
            instanceId: 'official-host',
          }),
        ).toEqual(generated);
        // The first test separately covers parseMathInput and context isolation.
      } finally {
        await host.close();
      }
    }, 30000);
    it('contains a synchronous spawn exception, releases its slot and runs the next request', async () => {
      const parent = spawn(
        process.execPath,
        [
          fileURLToPath(
            new URL('./fixtures/runtime/spawn-sync.mjs', import.meta.url),
          ),
        ],
        { windowsHide: true },
      );
      const chunks = [];
      parent.stdout.on('data', (chunk) => chunks.push(chunk));
      const exit = await new Promise((resolve) =>
        parent.once('close', resolve),
      );
      expect(exit).toBe(0);
      const observed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      expect(observed.failed).toMatchObject({
        ok: false,
        error: 'unavailable',
      });
      expect(observed.afterFailure).toMatchObject({
        active: 0,
        queued: 0,
        queuedBytes: 0,
      });
      expect(observed.next).toMatchObject({ ok: true, value: 1 });
      expect(observed.closed).toEqual({
        active: 0,
        queued: 0,
        queuedBytes: 0,
        closed: true,
      });
    }, 10000);
    it('rejects malformed payloads inside isolation and returns a runtime error distinct from a verdict', async () => {
      const host = createNodeHost();
      try {
        const malformed = await host.run(
          JSON.stringify({
            protocolVersion: 1,
            requestId: 'payload',
            operation: 'parseMathInput',
            payload: { context: {}, source: '1', profile: 'untrusted' },
          }),
        );
        expect(malformed).toMatchObject({
          ok: false,
          error: 'invalid-request',
        });
        const brokenOfficial = await host.run(
          JSON.stringify({
            protocolVersion: 1,
            requestId: 'official',
            operation: 'projectPublicInstance',
            payload: { official: { schemaVersion: 5 } },
          }),
        );
        expect(brokenOfficial).toMatchObject({
          ok: false,
          error: 'worker-error',
        });
        expect(await host.run(parse('recovered', '1+2'))).toMatchObject({
          ok: true,
          value: { ok: true },
        });
      } finally {
        await host.close();
      }
    }, 20000);
    it('actually kills a synchronous infinite calculation and rejects its early success', async () => {
      rmSync(marker, { force: true });
      await withHost({ timeoutMs: 1000, maxConcurrent: 1 }, async (host) => {
        const result = await host.run(encoded('hang'));
        expect(result).toMatchObject({ ok: false, error: 'timeout' });
        expect(readMarker().pid).toBe(result.metrics.workerPid);
        expect(alive(result.metrics.workerPid)).toBe(false);
        expect(result.metrics.elapsedMs).toBeLessThan(4000);
        expect(await host.run(encoded('echo', 42))).toMatchObject({
          ok: true,
          value: 42,
        });
      });
    }, 10000);
    it('native watchdog kills the worker even while the Node supervisor event loop stalls', async () => {
      rmSync(marker, { force: true });
      await withHost({ timeoutMs: 1200 }, async (host) => {
        const pending = host.run(encoded('hang'));
        await until(() => readMarker() !== null);
        const child = readMarker().pid;
        const deadline = performance.now() + 1800;
        while (performance.now() < deadline) {
          /* bounded supervisor stall */
        }
        expect(alive(child)).toBe(false);
        expect(await pending).toMatchObject({ ok: false, error: 'timeout' });
      });
    }, 10000);
    it('OS commit quota denies external Buffer allocation beyond the cap, outside the V8 heap', async () => {
      await withHost(
        { memoryMiB: 128, heapMiB: 32, timeoutMs: 5000 },
        async (host) => {
          const result = await host.run(encoded('buffer'));
          expect(result).toMatchObject({ ok: true, value: { denied: true } });
          expect(result.value.allocated).toBeGreaterThan(32 * 1048576);
          expect(result.value.external).toBeGreaterThan(32 * 1048576);
          expect(result.metrics.peakCommittedBytes).toBeLessThanOrEqual(
            128 * 1048576,
          );
          expect(alive(result.metrics.workerPid)).toBe(false);
          expect(await host.run(encoded())).toMatchObject({
            ok: true,
            value: 1,
          });
        },
      );
    }, 12000);
    it.each(['heap', 'crash'])(
      'recovers after %s failure without interpreting it as an incorrect answer',
      async (mode) => {
        await withHost({ memoryMiB: 128, heapMiB: 16 }, async (host) => {
          const failed = await host.run(encoded(mode));
          expect(failed).toMatchObject({ ok: false, error: 'crash' });
          expect(alive(failed.metrics.workerPid)).toBe(false);
          expect(await host.run(encoded())).toMatchObject({
            ok: true,
            value: 1,
          });
        });
      },
      12000,
    );
    it.each(['bad-json', 'double', 'wrong-id', 'no-newline'])(
      'rejects corrupted protocol %s and then recovers',
      async (mode) => {
        await withHost({}, async (host) => {
          expect(await host.run(encoded(mode))).toMatchObject({
            ok: false,
            error: 'protocol-error',
          });
          expect(await host.run(encoded())).toMatchObject({
            ok: true,
            value: 1,
          });
        });
      },
      12000,
    );
    it.each([
      ['stdout', 'output-limit'],
      ['stderr', 'stderr-limit'],
    ])(
      'bounds %s before concatenation',
      async (mode, error) => {
        await withHost(
          { maxOutputBytes: 1024, maxStderrBytes: 1024 },
          async (host) => {
            const result = await host.run(encoded(mode));
            expect(result).toMatchObject({ ok: false, error });
            expect(alive(result.metrics.workerPid)).toBe(false);
            expect(await host.run(encoded())).toMatchObject({ ok: true });
          },
        );
      },
      12000,
    );
    it('bounds concurrent workers and queued count, with duplicate IDs refused', async () => {
      await withHost({ maxConcurrent: 1, maxQueued: 1 }, async (host) => {
        const json = encoded('delay', 7);
        const first = host.run(json);
        expect(await host.run(json)).toMatchObject({
          ok: false,
          error: 'invalid-request',
        });
        const second = host.run(encoded('delay', 8));
        expect(host.stats()).toMatchObject({ active: 1, queued: 1 });
        expect(await host.run(encoded())).toMatchObject({
          ok: false,
          error: 'busy',
        });
        expect(await first).toMatchObject({ ok: true, value: 7 });
        const waited = await second;
        expect(waited).toMatchObject({ ok: true, value: 8 });
        expect(waited.metrics.queuedMs).toBeGreaterThan(250);
      });
    }, 12000);
    it('bounds total queued bytes independently of queue count', async () => {
      await withHost(
        { maxConcurrent: 1, maxQueued: 8, maxQueuedBytes: 1024 },
        async (host) => {
          const active = host.run(encoded('delay'));
          expect(
            await host.run(encoded('echo', 'x'.repeat(1024))),
          ).toMatchObject({ ok: false, error: 'busy' });
          await active;
        },
      );
    }, 10000);
    it('deadline includes time spent in the queue', async () => {
      await withHost(
        { timeoutMs: 700, maxConcurrent: 1, maxQueued: 1 },
        async (host) => {
          const first = host.run(encoded('hang'));
          const waiting = host.run(encoded('delay'));
          expect(await first).toMatchObject({ ok: false, error: 'timeout' });
          const second = await waiting;
          expect(second).toMatchObject({ ok: false, error: 'timeout' });
          expect(second.metrics.elapsedMs).toBeLessThan(2000);
        },
      );
    }, 10000);
    it('aborts running and queued work, waits for cleanup and closes idempotently', async () => {
      await withHost({ maxConcurrent: 1 }, async (host) => {
        const running = new AbortController(),
          waiting = new AbortController();
        const first = host.run(encoded('hang'), { signal: running.signal });
        const second = host.run(encoded(), { signal: waiting.signal });
        waiting.abort();
        expect(await second).toMatchObject({ ok: false, error: 'aborted' });
        running.abort();
        expect(await first).toMatchObject({ ok: false, error: 'aborted' });
        const work = host.run(encoded('hang'));
        await host.close();
        expect(await work).toMatchObject({ ok: false, error: 'closed' });
        expect(await host.run(encoded())).toMatchObject({
          ok: false,
          error: 'closed',
        });
      });
    }, 10000);
    it('cleans up worker and launcher after supervisor process death', async () => {
      rmSync(marker, { force: true });
      const parent = spawn(
        process.execPath,
        [
          fileURLToPath(
            new URL('./fixtures/runtime/parent.mjs', import.meta.url),
          ),
        ],
        { windowsHide: true },
      );
      let observed;
      try {
        await until(() => readMarker() !== null);
        observed = readMarker();
        expect(alive(observed.pid)).toBe(true);
        const closed = new Promise((resolve) => parent.once('close', resolve));
        parent.kill('SIGKILL');
        await closed;
        await until(() => !alive(observed.pid) && !alive(observed.launcherPid));
      } finally {
        if (parent.exitCode === null) parent.kill('SIGKILL');
      }
    }, 12000);
    it('limits process count so the worker cannot escape into children', async () => {
      await withHost({}, async (host) =>
        expect(await host.run(encoded('child'))).toMatchObject({
          ok: true,
          value: { childBlocked: true },
        }),
      );
    }, 10000);
    it('does not inherit NODE_OPTIONS, NODE_PATH or backend secrets', async () => {
      const previous = process.env.NOVLEARN_TEST_SECRET;
      process.env.NOVLEARN_TEST_SECRET = 'private-test';
      try {
        await withHost({}, async (host) =>
          expect(await host.run(encoded('environment'))).toMatchObject({
            ok: true,
            value: { secret: null, nodeOptions: null, nodePath: null },
          }),
        );
      } finally {
        if (previous === undefined) delete process.env.NOVLEARN_TEST_SECRET;
        else process.env.NOVLEARN_TEST_SECRET = previous;
      }
    }, 10000);
    it('handles a trusted worker filename containing spaces without shell interpolation', async () => {
      await withHost(
        {},
        async (host) =>
          expect(await host.run(encoded())).toMatchObject({
            ok: true,
            value: 1,
          }),
        new URL('./fixtures/runtime/worker space.mjs', import.meta.url),
      );
    }, 10000);
    it.each([
      '{',
      '{}',
      '{"protocolVersion":2}',
      '{"protocolVersion":1,"requestId":"r","operation":"eval","payload":{}}',
    ])(
      'rejects malformed/unknown requests without launching: %s',
      async (json) => {
        await withHost({}, async (host) => {
          expect(await host.run(json)).toMatchObject({
            ok: false,
            error: 'invalid-request',
          });
          expect(host.stats().active).toBe(0);
        });
      },
    );
    it('checks UTF8 bytes before parsing and never invokes a getter/toJSON', async () => {
      await withHost({ maxInputBytes: 1024 }, async (host) => {
        expect(await host.run('é'.repeat(600))).toMatchObject({
          ok: false,
          error: 'input-limit',
        });
        const tricky = {
          toJSON() {
            throw new Error('Must not execute.');
          },
        };
        expect(await host.run(tricky)).toMatchObject({
          ok: false,
          error: 'invalid-request',
        });
      });
    });
    it('rejects nonfinite JSON numbers and deeply nested JSON before mathematical dispatch', async () => {
      await withHost({}, async (host) => {
        expect(
          await host.run(
            '{"protocolVersion":1,"requestId":"r","operation":"validateDefinition","payload":{"value":1e999}}',
          ),
        ).toMatchObject({ ok: false, error: 'invalid-request' });
        const deep =
          '{"protocolVersion":1,"requestId":"r","operation":"validateDefinition","payload":{"value":' +
          '['.repeat(70) +
          '1' +
          ']'.repeat(70) +
          '}}';
        expect(await host.run(deep)).toMatchObject({
          ok: false,
          error: 'invalid-request',
        });
      });
    });
    it('validates limits and rejects worker path/command configuration', () => {
      for (const limits of [
        { memoryMiB: 0 },
        { maxConcurrent: 5 },
        { timeoutMs: 0 },
        { worker: 'evil' },
        { toString: 0 },
        { valueOf: 0 },
        { constructor: 0 },
        { heapMiB: 512, memoryMiB: 64 },
      ])
        expect(() => createNodeHost(limits)).toThrow(TypeError);
    });
  },
);
