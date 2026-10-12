import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gradeAnswer, projectPublicInstance } from '../dist/index.js';
import type { ExerciseInstance } from '../dist/index.js';

const evidence = JSON.parse(
  readFileSync(
    new URL('./e2e/fixtures/private-replay.json', import.meta.url),
    'utf8',
  ),
) as { instances: Record<string, { official: ExerciseInstance }> };
const official = Object.values(evidence.instances)[0]!.official;
const submission = {
  schemaVersion: 5,
  instanceId: official.instanceId,
  questionId: '1781009000002',
  answer: { format: 'latex', source: '\\sqrt{12}' },
};

describe('persisted official snapshot version gate', () => {
  it('reads and grades the supported JSON roundtrip', () => {
    const copied: ExerciseInstance = JSON.parse(JSON.stringify(official));
    expect(projectPublicInstance(copied).instanceId).toBe(official.instanceId);
    expect(gradeAnswer(copied, submission).state).toBe('correct');
  });
  for (const mutation of [
    { schemaVersion: 4 },
    { engineVersion: '0.0.0' },
    { engineVersion: '0.2.0' },
    { engineVersion: undefined },
    { generation: { ...official.generation, version: 'parameters-v1' } },
    { generation: undefined },
  ]) {
    it(`refuses unsupported persisted versions ${JSON.stringify(mutation)}`, () => {
      const copied = {
        ...official,
        ...mutation,
      } as unknown as ExerciseInstance;
      expect(gradeAnswer(copied, submission)).toMatchObject({
        state: 'error',
        value: 'unknown',
        proof: 'none',
        code: 'official-version',
      });
      expect(() => projectPublicInstance(copied)).toThrow(
        'unsupported-snapshot-version',
      );
    });
  }
});
