// Run inside the isolated service with `docker exec -i ... node --input-type=module`.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createRemoteHost } from 'novlearn-exercise-engine/remote-host';
const manifest = JSON.parse(
  await readFile('/opt/engine/engine-release.json', 'utf8'),
);
const token = process.env.ENGINE_TOKEN;
const url = 'http://127.0.0.1:3151/run';
const host = createRemoteHost({
  url,
  token,
  archiveSha256: manifest.archiveSha256,
});
const run = async (operation, payload) => {
  const response = await host.run(
    JSON.stringify({
      protocolVersion: 1,
      requestId: randomUUID(),
      operation,
      payload,
    }),
  );
  assert.equal(response.ok, true, JSON.stringify(response));
  return response.value;
};
const definition = JSON.parse(
  await readFile('/opt/engine/smoke-definition.json', 'utf8'),
);
try {
  assert.equal((await run('validateDefinition', { definition })).ok, true);
  const generated = await run('instantiateExercise', {
    definition,
    seed: 42,
    instanceId: randomUUID(),
  });
  assert.equal(generated.ok, true);
  const official = generated.value;
  const projected = await run('projectPublicInstance', { official });
  assert(!JSON.stringify(projected).includes('expected'));
  const sampled = await run('sampleDisplayGraph', {
    official,
    elementId: 'g',
    profile: 'display-graph-v1',
  });
  assert.equal(sampled.ok, true);
  assert.equal(sampled.value.profile, 'display-graph-v1');
  assert(
    sampled.value.series.every((series) =>
      series.points.every((point) => point.x !== 0),
    ),
  );
  for (const [source, expected] of [
    ['4', 'correct'],
    ['5', 'incorrect'],
  ]) {
    const correction = await run('gradeAnswer', {
      official,
      submission: {
        schemaVersion: 5,
        instanceId: official.instanceId,
        questionId: 'q',
        answer: { format: 'latex', source },
      },
    });
    assert.equal(correction.state, expected);
  }
  assert.equal((await fetch(url, { method: 'POST', body: '{}' })).status, 401);
  assert.equal(
    (
      await fetch(url, {
        method: 'POST',
        body: '{}',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-engine-archive-sha256': '0'.repeat(64),
        },
      })
    ).status,
    409,
  );
  const health = await fetch('http://127.0.0.1:3151/health', {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).archiveSha256, manifest.archiveSha256);
  console.log(
    JSON.stringify({
      result: 'PASS',
      version: manifest.packageVersion,
      archiveSha256: manifest.archiveSha256,
      officialHost: true,
      graph: true,
      grading: true,
      httpAuthentication: true,
    }),
  );
} finally {
  await host.close();
}
