import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as engine from 'novlearn-exercise-engine';
import { createNodeHost } from 'novlearn-exercise-engine/node-host';
import { adaptLegacyExercise } from 'novlearn-exercise-engine/legacy';
assert.equal(process.platform, 'linux');
assert.equal(typeof adaptLegacyExercise, 'function');
assert.deepEqual(
  Object.keys(engine).sort(),
  [
    'generateVariables',
    'gradeAnswer',
    'instantiateExercise',
    'parseMathInput',
    'projectPublicInstance',
    'validateDefinition',
    'validateSubmission',
  ].sort(),
);
const definition = JSON.parse(
  await readFile('/inputs/definition.json', 'utf8'),
);
assert.equal(engine.validateDefinition(definition).ok, true);
const local = engine.instantiateExercise(definition, {
  seed: 42,
  instanceId: 'installed-linux-local',
});
assert.equal(local.ok, true);
const submission = (instanceId) => ({
  schemaVersion: 5,
  instanceId,
  questionId: '1781009000002',
  answer: { format: 'latex', source: '\\sqrt{10}' },
});
assert.equal(
  engine.gradeAnswer(local.value, submission(local.value.instanceId)).state,
  'correct',
);
const host = createNodeHost();
let next = 0;
const operations = [];
async function send(operation, payload) {
  const result = await host.run(
    JSON.stringify({
      protocolVersion: 1,
      requestId: `package-linux-${++next}`,
      operation,
      payload,
    }),
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok(
    result.metrics.peakCgroupBytes > 0 &&
      result.metrics.peakCgroupBytes <= 384 * 1048576,
  );
  assert.throws(() => process.kill(result.metrics.workerPid, 0), {
    code: 'ESRCH',
  });
  operations.push(operation);
  return result.value;
}
try {
  assert.equal((await send('validateDefinition', { definition })).ok, true);
  assert.equal(
    (
      await send('validateSubmission', {
        submission: submission('installed-linux-host'),
      })
    ).ok,
    true,
  );
  const parsed = await send('parseMathInput', {
    source: ' x+1 ',
    context: { variables: ['x'] },
    profile: 'scalar-latex-v1',
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.source, ' x+1 ');
  const generated = await send('generateVariables', {
    definition: definition.generation,
    seed: 42,
  });
  assert.equal(generated.ok, true);
  const instantiated = await send('instantiateExercise', {
    definition,
    seed: 42,
    instanceId: 'installed-linux-host',
  });
  assert.equal(instantiated.ok, true);
  const official = JSON.parse(JSON.stringify(instantiated.value));
  const projection = await send('projectPublicInstance', { official });
  assert.doesNotMatch(
    JSON.stringify(projection),
    /expected|policy|correctAnswer|seed/,
  );
  assert.equal(
    (
      await send('gradeAnswer', {
        official,
        submission: submission(official.instanceId),
      })
    ).state,
    'correct',
  );
  const replay = await send('instantiateExercise', {
    definition,
    seed: 42,
    instanceId: 'installed-linux-host',
  });
  assert.deepEqual(replay.value, official);
} finally {
  await host.close();
}
assert.deepEqual(host.stats(), {
  active: 0,
  queued: 0,
  queuedBytes: 0,
  closed: true,
});
console.log(
  JSON.stringify({
    status: 'pass',
    platform: process.platform,
    node: process.version,
    operations,
    privateSnapshotReplayed: true,
    publicProjectionChecked: true,
    workersStopped: true,
    memoryMax: (await readFile('/sys/fs/cgroup/memory.max', 'utf8')).trim(),
    swapMax: (await readFile('/sys/fs/cgroup/memory.swap.max', 'utf8')).trim(),
    pidsMax: (await readFile('/sys/fs/cgroup/pids.max', 'utf8')).trim(),
  }),
);
