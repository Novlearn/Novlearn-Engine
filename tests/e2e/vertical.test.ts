import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  gradeAnswer,
  instantiateExercise,
  projectPublicInstance,
} from '../../dist/index.js';
import type {
  ExerciseDefinition,
  ExerciseInstance,
  AnswerSubmission,
} from '../../dist/index.js';

type Observation = {
  operation?: string;
  instanceId?: string;
  questionId?: string;
  answer?: AnswerSubmission['answer'];
  path?: string;
  status: number;
  data: unknown;
  events?: { type: string; key?: string; text?: string }[];
};
const read = (name: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'),
  );
const observed = read('browser-observations.json') as {
  version: string;
  locale: string;
  records: Observation[];
};
const resumed = read('browser-resume-duel.json') as { records: Observation[] };
const replay = read('private-replay.json') as {
  definitions: Record<string, ExerciseDefinition>;
  instances: Record<
    string,
    {
      official: ExerciseInstance;
      attempts: {
        questionId: string;
        answer: AnswerSubmission['answer'];
        correction: unknown;
      }[];
    }
  >;
};

describe('actual MathLive / FastAPI vertical observations', () => {
  it('captures physical French keyboard and real paste separately from API cases', () => {
    expect(observed.version).toBe('0.111.1');
    expect(observed.locale).toBe('fr');
    const keyboard = observed.records.find((r) => r.path === 'keyboard');
    expect(keyboard?.answer).toEqual({ format: 'latex', source: '1{,}25' });
    expect(
      keyboard?.events?.filter((e) => e.type === 'keydown').map((e) => e.key),
    ).toEqual(['1', ',', '2', '5']);
    const paste = observed.records.find((r) => r.path === 'paste');
    expect(paste?.events).toContainEqual({
      type: 'paste',
      text: '$$\\sqrt{12}$$',
    });
    expect(paste?.answer).toEqual({ format: 'latex', source: '\\sqrt{12}' });
    expect(
      observed.records.find(
        (r) =>
          r.answer?.format === 'latex' &&
          r.answer.source.includes('placeholder'),
      )?.path,
    ).toBe('mathlive-api');
  });

  for (const record of observed.records.filter(
    (r) => r.answer && r.status === 200,
  )) {
    it(`replays raw ${record.path} submission ${record.questionId}: ${JSON.stringify(record.answer)}`, () => {
      const official = replay.instances[record.instanceId!]?.official;
      expect(official).toBeDefined();
      expect(
        gradeAnswer(official!, {
          schemaVersion: 5,
          instanceId: record.instanceId!,
          questionId: record.questionId!,
          answer: record.answer!,
        }),
      ).toEqual(record.data);
    });
  }

  it('reproduces each private snapshot and its public HTTP projection', () => {
    for (const record of [...observed.records, ...resumed.records].filter(
      (r) => r.operation === 'create' || r.operation === 'create-round',
    )) {
      const publicInstance = record.data as { instanceId: string };
      const official = replay.instances[publicInstance.instanceId]!.official;
      const definition = replay.definitions['78']!;
      const result = instantiateExercise(definition, {
        seed: Number(official.generation.seed),
        instanceId: official.instanceId,
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(official);
      expect(projectPublicInstance(official)).toEqual(record.data);
    }
  });

  it('shows distinct transport failures, recovery, spoof refusal and expired round', () => {
    expect(
      observed.records.filter((r) => r.answer).map((r) => r.status),
    ).toEqual([200, 200, 200, 200, 200, 200, 200, 504, 503, 200]);
    expect(observed.records.find((r) => r.status === 504)?.data).toEqual({
      detail: 'timeout',
    });
    expect(observed.records.find((r) => r.status === 503)?.data).toEqual({
      detail: 'protocol-error',
    });
    expect(observed.records.find((r) => r.operation === 'spoof')?.status).toBe(
      422,
    );
    expect(
      resumed.records.find((r) => r.operation === 'expired-round'),
    ).toMatchObject({ status: 410, data: { detail: 'expired-round' } });
  });

  it('resumes partial work, then all three answers after a browser reload', () => {
    const partial = observed.records.find((r) => r.operation === 'resume')
      ?.data as { progress: unknown[] };
    const afterReload = resumed.records.find((r) => r.operation === 'resume')
      ?.data as {
      instance: unknown;
      progress: { correction: { state: string } }[];
    };
    expect(partial.progress).toHaveLength(2);
    expect(afterReload.progress).toHaveLength(3);
    expect(
      afterReload.progress.every((p) => p.correction.state === 'correct'),
    ).toBe(true);
    const privateKeys = new Set([
      'expected',
      'policy',
      'seed',
      'definition',
      'legacy',
      'expectedOptionIds',
    ]);
    function inspect(value: unknown): void {
      if (Array.isArray(value)) value.forEach(inspect);
      else if (value && typeof value === 'object')
        for (const [key, child] of Object.entries(value)) {
          expect(privateKeys.has(key)).toBe(false);
          inspect(child);
        }
    }
    [...observed.records, ...resumed.records].forEach((r) => inspect(r.data));
  });
});
