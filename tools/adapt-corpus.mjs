import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { adaptLegacyExercise } from 'novlearn-exercise-engine/legacy';
import { instantiateExercise, gradeAnswer } from 'novlearn-exercise-engine';

const bytes = await readFile(
  new URL('../docs/exercises_rows.json', import.meta.url),
);
const sourceHash = createHash('sha256').update(bytes).digest('hex');
if (
  sourceHash !==
  '0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae'
)
  throw new Error('Immutable corpus changed');
const rows = JSON.parse(bytes.toString('utf8'));
const recipes = JSON.parse(
  await readFile(
    new URL('../tests/fixtures/legacy/recipes.json', import.meta.url),
    'utf8',
  ),
);
const output = new URL('../tests/fixtures/legacy/adapted/', import.meta.url);
await mkdir(output, { recursive: true });
let blocked = 0;
for (const row of rows) {
  const result = adaptLegacyExercise(
    row,
    'database-row-v1',
    recipes[String(row.id)],
  );
  const report = {
    ...result.report,
    sourceHash,
    verification: { status: 'not-executed' },
  };
  if (result.ok) {
    const official = instantiateExercise(result.definition, {
      seed: 42,
      instanceId: `legacy-${row.id}-proof`,
    });
    if (official.ok) {
      const corrections = official.value.elements
        .filter((e) => e.type === 'question' || e.type === 'mcq')
        .map((q) =>
          gradeAnswer(official.value, {
            schemaVersion: 5,
            instanceId: official.value.instanceId,
            questionId: q.id,
            answer:
              q.type === 'mcq'
                ? { format: 'selection', optionIds: q.expected.optionIds }
                : { format: 'latex', source: q.expected.math.displayLatex },
          }),
        );
      report.verification = {
        status: corrections.every((c) => c.state === 'correct')
          ? 'passed'
          : 'failed',
        seed: 42,
        instanceId: official.value.instanceId,
        corrections,
      };
      if (report.verification.status !== 'passed') blocked++;
    } else {
      report.verification = {
        status: 'failed',
        diagnostics: official.diagnostics,
      };
      blocked++;
    }
    await writeFile(
      new URL(`${row.id}.definition.json`, output),
      JSON.stringify(result.definition, null, 2) + '\n',
    );
  } else blocked++;
  await writeFile(
    new URL(`${row.id}.report.json`, output),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      id: row.id,
      conversion: report.classification,
      verification: report.verification,
    }),
  );
}
if (blocked) process.exitCode = 1;
