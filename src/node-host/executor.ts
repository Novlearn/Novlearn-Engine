import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { accessSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
import type { JsonValue } from '../contracts/types.js';
import { boundedJson, object, request } from './protocol.js';

export interface HostLimits {
  timeoutMs: number;
  memoryMiB: number;
  heapMiB: number;
  maxInputBytes: number;
  maxOutputBytes: number;
  maxStderrBytes: number;
  maxConcurrent: number;
  maxQueued: number;
  maxQueuedBytes: number;
}
export type HostError =
  | 'invalid-request'
  | 'input-limit'
  | 'output-limit'
  | 'stderr-limit'
  | 'busy'
  | 'timeout'
  | 'aborted'
  | 'closed'
  | 'unavailable'
  | 'crash'
  | 'protocol-error'
  | 'worker-error';
export interface HostMetrics {
  elapsedMs: number;
  queuedMs: number;
  workerPid?: number;
  peakCommittedBytes?: number;
  /** Linux scope-wide cgroup charge peak, including supervisor/other workers. */
  peakCgroupBytes?: number;
}
export type HostResult = { requestId: string | null; metrics: HostMetrics } & (
  { ok: true; value: JsonValue } | { ok: false; error: HostError }
);
export interface NodeHost {
  /** JSON from a trusted backend, not a browser endpoint. No object getters are executed here. */
  run(json: string, options?: { signal?: AbortSignal }): Promise<HostResult>;
  close(): Promise<void>;
  stats(): {
    active: number;
    queued: number;
    queuedBytes: number;
    closed: boolean;
  };
}
const defaults: HostLimits = {
  timeoutMs: 5000,
  memoryMiB: 384,
  heapMiB: 128,
  maxInputBytes: 1048576,
  maxOutputBytes: 2097152,
  maxStderrBytes: 65536,
  maxConcurrent: 2,
  maxQueued: 8,
  maxQueuedBytes: 4194304,
};
function limits(options: Partial<HostLimits>): HostLimits {
  const merged = { ...defaults, ...options };
  const bounds: Record<keyof HostLimits, [number, number]> = {
    timeoutMs: [50, 60000],
    memoryMiB: [64, 2048],
    heapMiB: [16, 512],
    maxInputBytes: [1024, 1048576],
    maxOutputBytes: [1024, 4194304],
    maxStderrBytes: [1024, 65536],
    maxConcurrent: [1, 4],
    maxQueued: [0, 32],
    maxQueuedBytes: [0, 8388608],
  };
  if (Object.keys(options).some((key) => !Object.hasOwn(defaults, key)))
    throw new TypeError('Unknown host limit.');
  for (const key of Object.keys(bounds) as (keyof HostLimits)[]) {
    const [min, max] = bounds[key];
    if (
      !Number.isSafeInteger(merged[key]) ||
      merged[key] < min ||
      merged[key] > max
    )
      throw new TypeError(`Invalid host limit: ${key}`);
  }
  if (merged.heapMiB > merged.memoryMiB)
    throw new TypeError('Heap cannot exceed the OS commit quota.');
  return Object.freeze(merged);
}
interface Work {
  id: string;
  json: string;
  bytes: number;
  start: number;
  dispatched?: number;
  resolve: (result: HostResult) => void;
  timer: ReturnType<typeof setTimeout>;
  child?: ChildProcessWithoutNullStreams;
  forced?: HostError;
  pid?: number;
  detach: () => void;
}
/** Internal seam for trusted test fixture executables only; not a package export. */
export function createExecutor(
  worker: URL,
  options: Partial<HostLimits> = {},
): NodeHost {
  const quota = limits(options);
  const linux = process.platform === 'linux' && process.arch === 'x64';
  const launcher = linux
    ? '/usr/bin/python3'
    : fileURLToPath(new URL('./windows/job.exe', import.meta.url));
  const script = fileURLToPath(new URL('./linux/job.py', import.meta.url));
  let available =
    linux || (process.platform === 'win32' && process.arch === 'x64');
  try {
    accessSync(launcher);
    if (linux) accessSync(script);
  } catch {
    available = false;
  }
  const pending: Work[] = [];
  const active = new Set<Work>();
  const ids = new Set<string>();
  let queuedBytes = 0,
    closed = false;
  const completions = new Set<Promise<HostResult>>();
  const metrics = (work: Work): HostMetrics => ({
    elapsedMs: performance.now() - work.start,
    queuedMs: (work.dispatched ?? performance.now()) - work.start,
    ...(work.pid === undefined ? {} : { workerPid: work.pid }),
  });
  const settle = (work: Work, result: HostResult) => {
    clearTimeout(work.timer);
    work.detach();
    ids.delete(work.id);
    active.delete(work);
    work.resolve(result);
    drain();
  };
  const cancel = (work: Work, error: HostError) => {
    if (work.forced) return;
    work.forced = error;
    const index = pending.indexOf(work);
    if (index !== -1) {
      pending.splice(index, 1);
      queuedBytes -= work.bytes;
    }
    if (work.child) {
      // Windows forcefully terminates launcher. Its last job handle closes,
      // killing the worker. Completion awaits close of ALL inherited stdio.
      work.child.kill('SIGKILL');
    } else
      settle(work, {
        requestId: work.id,
        ok: false,
        error,
        metrics: metrics(work),
      });
  };
  const dispatch = (work: Work) => {
    work.dispatched = performance.now();
    active.add(work);
    const remaining = Math.ceil(
      quota.timeoutMs - (work.dispatched - work.start),
    );
    if (remaining <= 0) {
      cancel(work, 'timeout');
      return;
    }
    const env: NodeJS.ProcessEnv = {};
    for (const name of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP'])
      if (process.env[name] !== undefined) env[name] = process.env[name];
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(
        launcher,
        [
          ...(linux ? [script] : []),
          process.execPath,
          fileURLToPath(worker),
          String(quota.memoryMiB * 1048576),
          String(quota.heapMiB),
          String(quota.maxInputBytes),
          String(remaining),
        ],
        {
          env,
          windowsHide: true,
          shell: false,
        },
      );
    } catch {
      settle(work, {
        requestId: work.id,
        ok: false,
        error: 'unavailable',
        metrics: metrics(work),
      });
      return;
    }
    work.child = child;
    const stdout: Buffer[] = [];
    let bytes = 0,
      stderrBytes = 0,
      launchFailed = false;
    let firstLine = Buffer.alloc(0);
    child.stdout.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > quota.maxOutputBytes) {
        cancel(work, 'output-limit');
        return;
      }
      stdout.push(chunk);
      if (work.pid === undefined && firstLine.length < 512) {
        firstLine = Buffer.concat([
          firstLine,
          chunk.subarray(0, 512 - firstLine.length),
        ]);
        const end = firstLine.indexOf(10);
        if (end !== -1) {
          try {
            const frame: unknown = JSON.parse(
              firstLine.subarray(0, end).toString('utf8'),
            );
            if (
              object(frame) &&
              frame.runtime === 1 &&
              frame.event === 'started' &&
              Number.isSafeInteger(frame.pid) &&
              (frame.pid as number) > 0
            )
              work.pid = frame.pid as number;
          } catch {
            /* Full protocol validation follows close. */
          }
        }
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > quota.maxStderrBytes) cancel(work, 'stderr-limit');
    });
    child.on('error', () => {
      launchFailed = true;
    });
    child.stdin.on('error', () => {
      /* Early worker exit handled by close. */
    });
    child.on('close', (code) => {
      let result: HostResult;
      const measurement = metrics(work);
      const fail = (error: HostError): HostResult => ({
        requestId: work.id,
        ok: false,
        error,
        metrics: measurement,
      });
      if (work.forced) result = fail(work.forced);
      else if (code === 75 || measurement.elapsedMs >= quota.timeoutMs)
        result = fail('timeout');
      else if (launchFailed || code === 70) result = fail('unavailable');
      else {
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(
            Buffer.concat(stdout),
          );
          if (!text.endsWith('\n')) throw new Error();
          const frames: unknown[] = text
            .slice(0, -1)
            .split('\n')
            .map((line) => JSON.parse(line) as unknown);
          const [started, response, finished] = frames;
          if (
            !object(started) ||
            started.runtime !== 1 ||
            started.event !== 'started' ||
            started.pid !== work.pid ||
            started.memoryLimitBytes !== quota.memoryMiB * 1048576
          )
            throw new Error();
          if (
            frames.length !== 3 ||
            !object(finished) ||
            finished.runtime !== 1 ||
            finished.event !== 'finished' ||
            finished.pid !== work.pid ||
            !Number.isSafeInteger(
              finished[linux ? 'peakCgroupBytes' : 'peakCommittedBytes'],
            ) ||
            (finished[
              linux ? 'peakCgroupBytes' : 'peakCommittedBytes'
            ] as number) < 0
          )
            throw new Error();
          if (linux)
            measurement.peakCgroupBytes = finished.peakCgroupBytes as number;
          else {
            if (
              (finished.peakCommittedBytes as number) >
              quota.memoryMiB * 1048576
            )
              throw new Error();
            measurement.peakCommittedBytes =
              finished.peakCommittedBytes as number;
          }
          if (code !== 0 || finished.exitCode !== 0) result = fail('crash');
          else if (
            !object(response) ||
            response.protocolVersion !== 1 ||
            response.requestId !== work.id ||
            !boundedJson(response)
          )
            throw new Error();
          else if (
            response.ok === true &&
            Object.keys(response).sort().join(',') ===
              'ok,protocolVersion,requestId,value'
          )
            result = {
              requestId: work.id,
              ok: true,
              value: response.value as JsonValue,
              metrics: measurement,
            };
          else if (
            response.ok === false &&
            Object.keys(response).sort().join(',') ===
              'error,ok,protocolVersion,requestId' &&
            ['invalid-request', 'input-limit', 'worker-error'].includes(
              response.error as string,
            )
          )
            result = fail(response.error as HostError);
          else throw new Error();
        } catch {
          result = fail(code === 0 ? 'protocol-error' : 'crash');
        }
      }
      settle(work, result);
    });
    // Keep lifetime stdin open: launcher forwards exactly one line, then watches
    // EOF from this parent. Child receives EOF after that one private request.
    child.stdin.write(work.json + '\n');
  };
  function drain() {
    while (!closed && active.size < quota.maxConcurrent && pending.length) {
      const work = pending.shift()!;
      queuedBytes -= work.bytes;
      dispatch(work);
    }
  }
  return {
    run(json, runOptions = {}) {
      const start = performance.now();
      let id: string | null = null;
      const rejected = (error: HostError) =>
        Promise.resolve<HostResult>({
          requestId: id,
          ok: false,
          error,
          metrics: { elapsedMs: performance.now() - start, queuedMs: 0 },
        });
      if (closed) return rejected('closed');
      if (!available) return rejected('unavailable');
      if (typeof json !== 'string') return rejected('invalid-request');
      if (Buffer.byteLength(json, 'utf8') > quota.maxInputBytes)
        return rejected('input-limit');
      let input: unknown;
      try {
        input = JSON.parse(json) as unknown;
      } catch {
        return rejected('invalid-request');
      }
      if (!boundedJson(input) || !request(input))
        return rejected('invalid-request');
      id = input.requestId;
      if (ids.has(id)) return rejected('invalid-request');
      if (runOptions.signal?.aborted) return rejected('aborted');
      const normalized = JSON.stringify(input);
      const size = Buffer.byteLength(normalized, 'utf8');
      if (size > quota.maxInputBytes) return rejected('input-limit');
      if (
        active.size >= quota.maxConcurrent &&
        (pending.length >= quota.maxQueued ||
          queuedBytes + size > quota.maxQueuedBytes)
      )
        return rejected('busy');
      let work: Work;
      const done = new Promise<HostResult>((resolve) => {
        const timer = setTimeout(
          () => cancel(work, 'timeout'),
          Math.max(0, quota.timeoutMs - (performance.now() - start)),
        );
        const abort = () => cancel(work, 'aborted');
        work = {
          id: id!,
          json: normalized,
          bytes: size,
          start,
          resolve,
          timer,
          detach: () => runOptions.signal?.removeEventListener('abort', abort),
        };
        runOptions.signal?.addEventListener('abort', abort, { once: true });
        ids.add(work.id);
        if (active.size < quota.maxConcurrent) dispatch(work);
        else {
          pending.push(work);
          queuedBytes += size;
        }
      });
      completions.add(done);
      void done.then(() => completions.delete(done));
      return done;
    },
    async close() {
      closed = true;
      for (const work of [...pending, ...active]) cancel(work, 'closed');
      await Promise.all([...completions]);
    },
    stats: () => ({
      active: active.size,
      queued: pending.length,
      queuedBytes,
      closed,
    }),
  };
}
