import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { createExecutor } from '../../../dist/node-host/executor.js';
const original = childProcess.spawn;
childProcess.spawn = () => {
  childProcess.spawn = original;
  syncBuiltinESMExports();
  throw new Error('Trusted synchronous spawn failure fixture.');
};
syncBuiltinESMExports();
const host = createExecutor(new URL('./chaos.mjs', import.meta.url));
const request = JSON.stringify({
  protocolVersion: 1,
  requestId: 'spawn',
  operation: 'validateDefinition',
  payload: {},
});
const failed = await host.run(request);
const afterFailure = host.stats();
const next = await host.run(request);
await host.close();
process.stdout.write(
  JSON.stringify({ failed, afterFailure, next, closed: host.stats() }),
);
