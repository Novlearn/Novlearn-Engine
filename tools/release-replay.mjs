import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const currentWorkspace = resolve(process.argv[2]);
const previousTarball = resolve(process.argv[3]);
const previousConsumer = join(currentWorkspace, 'previous-consumer');
await mkdir(previousConsumer, { recursive: true });
await writeFile(
  join(previousConsumer, 'package.json'),
  JSON.stringify({
    name: 'previous-artifact-consumer',
    private: true,
    type: 'module',
  }),
);
const npmCli =
  process.env.npm_execpath ??
  join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const installed = spawnSync(
  process.execPath,
  [
    npmCli,
    'install',
    '--prefer-offline',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--cache',
    join(root, '.cache/m9-linux-validation/.npm-cache'),
    previousTarball,
  ],
  { cwd: previousConsumer, encoding: 'utf8', timeout: 120000 },
);
assert.equal(installed.status, 0, installed.stderr);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const report = JSON.parse(
  await readFile(join(currentWorkspace, 'report.json'), 'utf8'),
);
const current = await import(
  pathToFileURL(
    join(
      report.consumer,
      'node_modules/novlearn-exercise-engine/dist/index.js',
    ),
  )
);
const previous = await import(
  pathToFileURL(
    join(
      previousConsumer,
      'node_modules/novlearn-exercise-engine/dist/index.js',
    ),
  )
);
const oldIdentity = {
  schemaVersion: 1,
  packageVersion: '0.1.0',
  tarballSha256: sha(await readFile(previousTarball)),
  dependencyLockSha256: sha(
    await readFile(join(previousConsumer, 'package-lock.json')),
  ),
};
const newIdentity = {
  schemaVersion: 1,
  packageVersion: report.packageVersion,
  tarballSha256: report.sha256,
  dependencyLockSha256: sha(
    await readFile(join(report.consumer, 'package-lock.json')),
  ),
};
const registry = new Map([
  [oldIdentity.tarballSha256, { engine: previous, identity: oldIdentity }],
  [newIdentity.tarballSha256, { engine: current, identity: newIdentity }],
]);
assert.equal(registry.size, 2, 'Two distinct immutable artifacts required');
const definition = JSON.parse(
  await readFile(
    join(root, 'tests/fixtures/legacy/adapted/78.definition.json'),
    'utf8',
  ),
);
const generated = previous.instantiateExercise(definition, {
  seed: 42,
  instanceId: 'persisted-previous-instance',
});
assert.equal(generated.ok, true);
const official = generated.value;
const submission = {
  schemaVersion: 5,
  instanceId: official.instanceId,
  questionId: '1781009000002',
  answer: { format: 'latex', source: '\\sqrt{10}' },
};
const envelope = {
  envelopeVersion: 1,
  attemptId: 'attempt-demo-1',
  ownerId: 'demo-alice',
  artifact: oldIdentity,
  publishedDefinition: {
    definitionVersion: 1,
    id: definition.id,
    revision: definition.revision,
    definition,
  },
  official,
  submission,
  correction: previous.gradeAnswer(official, submission),
};
assert.equal(envelope.correction.state, 'correct');
const persisted = JSON.parse(JSON.stringify(envelope));
function replay(stored) {
  assert.equal(stored.envelopeVersion, 1, 'unsupported-envelope');
  const selected = registry.get(stored.artifact.tarballSha256);
  assert(selected, 'unknown-artifact');
  assert.deepEqual(
    stored.artifact,
    selected.identity,
    'artifact-or-lock-mismatch',
  );
  assert.equal(
    stored.publishedDefinition.definitionVersion,
    1,
    'definition-envelope-version',
  );
  assert.equal(
    stored.publishedDefinition.id,
    stored.publishedDefinition.definition.id,
    'published-id',
  );
  assert.equal(
    stored.publishedDefinition.revision,
    stored.publishedDefinition.definition.revision,
    'published-revision',
  );
  assert.deepEqual(
    stored.official.definition,
    stored.publishedDefinition.definition,
    'snapshot-definition',
  );
  assert.equal(
    stored.submission.instanceId,
    stored.official.instanceId,
    'submission-instance',
  );
  assert.equal(
    stored.correction.instanceId,
    stored.official.instanceId,
    'correction-instance',
  );
  assert.equal(
    stored.correction.questionId,
    stored.submission.questionId,
    'correction-question',
  );
  assert.equal(stored.official.schemaVersion, 5, 'snapshot-version');
  assert.equal(stored.official.engineVersion, '0.1.0', 'engine-version');
  assert.equal(
    stored.official.generation.version,
    'mulberry32-rejection-v1',
    'generator-version',
  );
  assert.equal(
    selected.engine.validateDefinition(stored.publishedDefinition.definition)
      .ok,
    true,
  );
  assert.equal(selected.engine.validateSubmission(stored.submission).ok, true);
  const regenerated = selected.engine.instantiateExercise(
    stored.publishedDefinition.definition,
    {
      seed: Number(stored.official.generation.seed),
      instanceId: stored.official.instanceId,
    },
  );
  assert.equal(regenerated.ok, true, 'snapshot-regeneration');
  assert.deepEqual(
    JSON.parse(JSON.stringify(regenerated.value)),
    stored.official,
    'snapshot-provenance',
  );
  assert.deepEqual(
    selected.engine.gradeAnswer(stored.official, stored.submission),
    stored.correction,
  );
  return selected.engine.projectPublicInstance(stored.official);
}
const previousPublic = replay(persisted);
// Qualify this exact upgrade, then route new attempts to the new immutable artifact.
assert.deepEqual(
  current.gradeAnswer(official, submission),
  persisted.correction,
);
assert.deepEqual(current.projectPublicInstance(official), previousPublic);
const upgraded = {
  ...persisted,
  attemptId: 'attempt-demo-2',
  artifact: newIdentity,
};
assert.deepEqual(replay(upgraded), previousPublic);
// Rollback preserves old attempts' original artifact and keeps both artifacts routable.
assert.deepEqual(replay(persisted), previousPublic);
const corruptionGuards = [
  'unsupported-envelope',
  'unknown-artifact',
  'artifact-or-lock-mismatch',
  'engine-version',
  'published-id',
  'published-revision',
  'snapshot-definition',
  'submission-instance',
  'correction-question',
  'snapshot-provenance',
  'snapshot-provenance',
];
const corruptedAttempts = [
  { ...persisted, envelopeVersion: 2 },
  { ...persisted, artifact: { ...oldIdentity, tarballSha256: '0'.repeat(64) } },
  {
    ...persisted,
    artifact: { ...oldIdentity, dependencyLockSha256: '0'.repeat(64) },
  },
  {
    ...persisted,
    official: { ...persisted.official, engineVersion: '0.0.0' },
  },
  {
    ...persisted,
    publishedDefinition: { ...persisted.publishedDefinition, id: 'wrong-id' },
  },
  {
    ...persisted,
    publishedDefinition: {
      ...persisted.publishedDefinition,
      revision: 'wrong-revision',
    },
  },
  {
    ...persisted,
    publishedDefinition: {
      ...persisted.publishedDefinition,
      definition: { ...definition, title: 'Different published definition' },
    },
  },
  { ...persisted, submission: { ...submission, instanceId: 'wrong-instance' } },
  {
    ...persisted,
    correction: { ...persisted.correction, questionId: 'wrong-question' },
  },
  {
    ...persisted,
    official: {
      ...persisted.official,
      generation: { ...persisted.official.generation, seed: '43' },
    },
  },
  {
    ...persisted,
    official: {
      ...persisted.official,
      title: 'Different instantiated snapshot',
    },
  },
];
assert.equal(corruptedAttempts.length, corruptionGuards.length);
for (const [index, damaged] of corruptedAttempts.entries())
  assert.throws(() => replay(damaged), new RegExp(corruptionGuards[index]));
await writeFile(
  join(currentWorkspace, 'persisted-attempt.private.json'),
  JSON.stringify(persisted, null, 2),
);
await writeFile(
  join(currentWorkspace, 'rollback-report.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      previous: oldIdentity,
      current: newIdentity,
      replay: 'passed',
      qualifiedUpgrade: 'passed',
      rollback: 'passed',
      rejectedCorruptions: 11,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    replay: 'passed',
    upgrade: 'passed',
    rollback: 'passed',
    previous: oldIdentity.tarballSha256,
    current: newIdentity.tarballSha256,
  }),
);
