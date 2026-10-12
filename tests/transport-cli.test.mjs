import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../dist/node-host/cli.js', import.meta.url));
const request = (id = 'cli') =>
  JSON.stringify({
    protocolVersion: 1,
    requestId: id,
    operation: 'parseMathInput',
    payload: { source: ' 1+2 ', context: {}, profile: 'scalar-latex-v1' },
  });
async function run(input, args = [], end = true) {
  const child = spawn(process.execPath, [cli, ...args], { windowsHide: true });
  let output = '',
    stderr = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString('utf8');
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });
  const timer = setTimeout(() => child.kill('SIGKILL'), 12000);
  try {
    const result = new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, output, stderr }));
    });
    child.stdin.on('error', () => {});
    child.stdin.write(input);
    if (end) child.stdin.end();
    return await result;
  } finally {
    clearTimeout(timer);
  }
}
describe('Private bounded JSON CLI framing', () => {
  it('refuses unknown trusted launch options without executing a worker', async () => {
    expect(await run('', ['--worker=untrusted'])).toMatchObject({
      code: 64,
      output: '',
    });
  });
  it.each(['{', '{"protocolVersion":2}', '{"operation":"eval"}'])(
    'rejects malformed or forbidden request %s',
    async (line) => {
      const result = await run(line + '\n');
      expect(result.code).toBe(0);
      expect(JSON.parse(result.output)).toMatchObject({
        transportVersion: 1,
        requestId: null,
        ok: false,
        error: 'invalid-request',
      });
    },
  );
  it('refuses invalid UTF8 before decoding a mathematical source', async () => {
    const line = Buffer.concat([
      Buffer.from(request().replace(' 1+2 ', '')),
      Buffer.from([0xff]),
      Buffer.from('\n'),
    ]);
    const result = await run(line);
    expect(JSON.parse(result.output)).toMatchObject({
      ok: false,
      error: 'invalid-request',
    });
    expect(result.output).not.toContain('workerPid');
  });
  it('drains an oversized line without concatenating beyond the input cap', async () => {
    const result = await run('x'.repeat(1048577) + '\n');
    expect(JSON.parse(result.output)).toMatchObject({
      ok: false,
      error: 'input-limit',
    });
  });
  it('refuses an unterminated final frame', async () => {
    expect(await run(request())).toMatchObject({ code: 65, output: '' });
  });
  it('bounds frames within one read chunk even when stdin pause cannot help', async () => {
    const result = await run(
      Array.from({ length: 11 }, (_, i) => request('burst' + i)).join('\n') +
        '\n',
    );
    expect(result.code).toBe(65);
    expect(result.output.trim().split('\n').length).toBeLessThanOrEqual(10);
  });
  it.skipIf(process.platform !== 'win32' || process.arch !== 'x64')(
    'serves a single real request and exits while the caller keeps stdin open',
    async () => {
      const result = await run(request() + '\n', ['--once'], false);
      expect(result.code, result.stderr).toBe(0);
      expect(JSON.parse(result.output)).toMatchObject({
        transportVersion: 1,
        requestId: 'cli',
        ok: true,
        value: { source: ' 1+2 ', ok: true },
      });
    },
    15000,
  );
  it.skipIf(process.platform !== 'win32' || process.arch !== 'x64')(
    'serves multiple CRLF frames with fresh math processes and correlated IDs',
    async () => {
      const result = await run(
        request('first') + '\r\n' + request('second') + '\r\n',
      );
      expect(result.code, result.stderr).toBe(0);
      const frames = result.output
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      expect(frames.map((frame) => frame.requestId).sort()).toEqual([
        'first',
        'second',
      ]);
      expect(frames.every((frame) => frame.ok)).toBe(true);
      expect(frames[0].metrics.workerPid).not.toBe(frames[1].metrics.workerPid);
    },
    15000,
  );
});
