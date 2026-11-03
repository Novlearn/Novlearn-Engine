import { expect, it } from 'vitest';
import {
  instantiateExercise,
  gradeAnswer,
  projectPublicInstance,
} from 'novlearn-exercise-engine';
import type { ExerciseDefinition } from 'novlearn-exercise-engine';

const definition = (
  value: string,
  kind: 'rational' | 'real' = 'rational',
): ExerciseDefinition => ({
  schemaVersion: 5,
  kind: 'composed',
  id: 'numeric-display-roundtrip',
  revision: '1',
  title: 'Numeric display roundtrip',
  generation: {
    schemaVersion: 5,
    definitions: [],
    constraints: [],
    maxAttempts: 4,
    maxDraws: 16,
  },
  variables: [],
  elements: [
    {
      id: 'q',
      type: 'question',
      text: 'Valeur',
      points: 1,
      response: { format: 'latex', kind },
      expectedLatex: value,
      policy: { domain: kind, form: 'value-only' },
    },
  ],
});
it.each(['1287.5', '1326.125', '1000000', '-12345.125'])(
  'numeric expected display %s is admitted without relaxing grouped-input guards',
  (value) => {
    for (const kind of ['rational', 'real'] as const) {
      const source = definition(value, kind);
      const run = instantiateExercise(source, {
        seed: 42,
        instanceId: 'roundtrip',
      });
      expect(run.ok).toBe(true);
      if (!run.ok) throw Error(JSON.stringify(run));
      const question = run.value.elements[0]!;
      if (question.type !== 'question' || question.expected.kind === 'text')
        throw Error('Expected math');
      const display = question.expected.math.displayLatex;
      expect(display).not.toContain('\\,');
      expect(question.expected.math.source).toBe(value);
      const grade = (text: string) =>
        gradeAnswer(run.value, {
          schemaVersion: 5,
          instanceId: 'roundtrip',
          questionId: 'q',
          answer: { format: 'latex', source: text },
        });
      expect(grade(display).state).toBe('correct');
      expect(grade('0').state).toBe('incorrect');
      expect(grade('1\\,000').state).toBe('indeterminate');
      expect(
        instantiateExercise(source, { seed: 42, instanceId: 'roundtrip' }),
      ).toEqual(run);
      expect(projectPublicInstance(run.value)).not.toHaveProperty('expected');
    }
  },
);
