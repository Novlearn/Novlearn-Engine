import { expect, it } from 'vitest';
import {
  validateDefinition,
  instantiateExercise,
  sampleDisplayGraph,
  gradeAnswer,
} from 'novlearn-exercise-engine';
import definition from '../deploy/smoke-definition.json' with { type: 'json' };

it('uses an admissible deployment fixture, preserves a domain gap and grades on the official instance', async () => {
  expect(validateDefinition(definition).ok).toBe(true);
  const generated = instantiateExercise(definition, {
    seed: 42,
    instanceId: 'deployment-smoke',
  });
  expect(generated.ok).toBe(true);
  if (!generated.ok) throw new Error('Deployment fixture generation failed');
  const sampled = await sampleDisplayGraph(generated.value, 'g');
  expect(sampled.ok).toBe(true);
  if (!sampled.ok) throw new Error('Deployment graph generation failed');
  expect(sampled.value.series[0]?.points.every((point) => point.x !== 0)).toBe(
    true,
  );
  expect(
    gradeAnswer(generated.value, {
      schemaVersion: 5,
      instanceId: 'deployment-smoke',
      questionId: 'q',
      answer: { format: 'latex', source: '4' },
    }).state,
  ).toBe('correct');
});
