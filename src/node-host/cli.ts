#!/usr/bin/env node
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';
import { createNodeHost } from './index.js';
import type { HostResult } from './executor.js';

// Trusted backend channel only. No command, worker path or quota from stdin.
const once = process.argv.length === 3 && process.argv[2] === '--once';
if (process.argv.length > 2 && !once) process.exit(64);
const host = createNodeHost();
const inputLimit = 1048576;
let input = Buffer.alloc(0),
  discarding = false,
  ended = false;
let count = 0;
const running = new Set<Promise<void>>();
let output: Promise<void> = Promise.resolve();
function emit(result: HostResult): Promise<void> {
  const frame =
    JSON.stringify({
      transportVersion: 1,
      ...result,
      metrics: {
        ...result.metrics,
        supervisorRssBytes: process.memoryUsage().rss,
      },
    }) + '\n';
  output = output.then(
    () =>
      new Promise<void>((resolve, reject) => {
        process.stdout.write(frame, (error) =>
          error ? reject(error) : resolve(),
        );
      }),
  );
  return output;
}
function submit(line: Buffer | null) {
  count++;
  const job = (async () => {
    if (line === null)
      await emit({
        requestId: null,
        ok: false,
        error: 'input-limit',
        metrics: { elapsedMs: 0, queuedMs: 0 },
      });
    else {
      let json: string;
      try {
        json = new TextDecoder('utf-8', { fatal: true }).decode(line);
      } catch {
        await emit({
          requestId: null,
          ok: false,
          error: 'invalid-request',
          metrics: { elapsedMs: 0, queuedMs: 0 },
        });
        return;
      }
      await emit(await host.run(json));
    }
  })();
  running.add(job);
  if (running.size >= 10) process.stdin.pause();
  void job
    .catch(() => {
      process.exitCode = 74;
      void host.close();
      process.stdin.destroy();
    })
    .finally(() => {
      running.delete(job);
      if (!ended && running.size < 10) process.stdin.resume();
      if (once) {
        ended = true;
        process.stdin.destroy();
        void finish();
      }
    });
}
async function finish() {
  ended = true;
  await Promise.allSettled(running);
  await host.close();
  await output.catch(() => {
    process.exitCode = 74;
  });
}
process.stdin.on('data', (chunk: Buffer) => {
  // A chunk may contain several frames; pause only stops future chunks.
  let offset = 0;
  while (offset < chunk.length) {
    if (once && count > 0) break;
    const end = chunk.indexOf(10, offset);
    const stop = end === -1 ? chunk.length : end;
    if (!discarding) {
      if (input.length + stop - offset > inputLimit) {
        input = Buffer.alloc(0);
        discarding = true;
      } else input = Buffer.concat([input, chunk.subarray(offset, stop)]);
    }
    if (end === -1) break;
    if (running.size >= 10) {
      // Fixed concurrency bound even for many lines in a single read chunk.
      process.exitCode = 65;
      process.stdin.destroy();
      void host.close();
      return;
    }
    submit(discarding ? null : input);
    input = Buffer.alloc(0);
    discarding = false;
    offset = end + 1;
  }
});
process.stdin.on('end', () => {
  if (input.length > 0 || discarding) {
    process.exitCode = 65;
  }
  void finish();
});
process.stdin.on('error', () => {
  process.exitCode = 74;
  void finish();
});
process.stdout.on('error', () => {
  process.exitCode = 74;
  process.stdin.destroy();
  void host.close();
});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    process.exitCode = 130;
    process.stdin.destroy();
    void host.close();
  });
