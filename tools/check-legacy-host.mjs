import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNodeHost } from 'novlearn-exercise-engine/node-host';

const rows = JSON.parse(await readFile(process.env.LEGACY_CORPUS, 'utf8'));
const recipes = JSON.parse(await readFile(process.env.LEGACY_RECIPES, 'utf8'));
const host = createNodeHost();
let requestId = 0;
async function send(operation, payload) {
  const result = await host.run(
    JSON.stringify({
      protocolVersion: 1,
      requestId: `legacy_host_${requestId++}`,
      operation,
      payload,
    }),
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}
try {
  for (const row of rows) {
    const adapted = await send('adaptLegacyExercise', {
      source: row,
      sourceFormat: 'database-row-v1',
      recipe: recipes[row.id],
    });
    assert.equal(adapted.ok, true, JSON.stringify(adapted.report.diagnostics));
    assert.deepEqual(adapted.report.original, row);
    const instance = await send('instantiateExercise', {
      definition: adapted.definition,
      seed: 42,
      instanceId: `host-legacy-${row.id}`,
    });
    assert.equal(instance.ok, true, JSON.stringify(instance));
    const official = instance.value;
    const display = await send('projectPublicInstance', { official });
    assert.doesNotMatch(
      JSON.stringify(display),
      /expected|policy|legacyPath|correctAnswer|seed/,
    );
    for (const q of official.elements)
      if (q.type === 'question' || q.type === 'mcq') {
        const correction = await send('gradeAnswer', {
          official,
          submission: {
            schemaVersion: 5,
            instanceId: official.instanceId,
            questionId: q.id,
            answer:
              q.type === 'mcq'
                ? { format: 'selection', optionIds: q.expected.optionIds }
                : { format: 'latex', source: q.expected.math.displayLatex },
          },
        });
        assert.equal(correction.state, 'correct', JSON.stringify(correction));
      }
    console.log(
      JSON.stringify({
        id: row.id,
        adaptation: 'passed',
        officialPipeline: 'passed',
      }),
    );
  }
  const invalid = await send('adaptLegacyExercise', {
    source: rows[0],
    sourceFormat: 'database-row-v1',
    recipe: {},
  });
  assert.equal(invalid.ok, false);
  console.log('isolated legacy host: 8 rows and invalid recipe PASS');
} finally {
  await host.close();
}
