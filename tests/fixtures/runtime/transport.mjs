import process from 'node:process';
import { createInterface } from 'node:readline';
const reader = createInterface({ input: process.stdin });
reader.on('line', (line) => {
  const request = JSON.parse(line);
  const mode = request.payload.mode;
  if (mode === 'hang') return;
  if (mode === 'crash') process.exit(9);
  if (mode === 'overflow') {
    process.stdout.write('x'.repeat(2099201) + '\n');
    return;
  }
  if (mode === 'corrupt') {
    process.stdout.write('{}\n');
    return;
  }
  const response = {
    transportVersion: 1,
    requestId: request.requestId,
    ok: true,
    value: 1,
    metrics: { elapsedMs: 0, queuedMs: 0 },
  };
  if (mode === 'boolean-version') response.transportVersion = true;
  if (mode === 'list-error') {
    response.ok = false;
    delete response.value;
    response.error = [];
  }
  if (mode === 'deep') {
    for (let i = 0; i < 70; i++) response.value = [response.value];
  }
  if (mode === 'nonfinite') {
    process.stdout.write(
      JSON.stringify(response).replace('"value":1', '"value":1e999') + '\n',
    );
    return;
  }
  if (mode === 'huge-metric') {
    process.stdout.write(
      JSON.stringify(response).replace(
        '"elapsedMs":0',
        '"elapsedMs":1' + '0'.repeat(400),
      ) + '\n',
    );
    return;
  }
  if (['boolean-version', 'list-error', 'deep'].includes(mode)) {
    process.stdout.write(JSON.stringify(response) + '\n');
    return;
  }
  process.stdout.write(
    JSON.stringify({
      transportVersion: 1,
      requestId: request.requestId,
      ok: true,
      value: { pid: process.pid },
      metrics: { elapsedMs: 0, queuedMs: 0 },
    }) + '\n',
  );
});
