import { createExecutor } from '../../../dist/node-host/executor.js';
const host = createExecutor(new URL('./chaos.mjs', import.meta.url), {
  timeoutMs: 30000,
});
await host.run(
  JSON.stringify({
    protocolVersion: 1,
    requestId: 'parent',
    operation: 'validateDefinition',
    payload: { mode: 'hang' },
  }),
);
await host.close();
