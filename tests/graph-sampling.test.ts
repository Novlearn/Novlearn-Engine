import { describe, it, expect, vi } from 'vitest';
import {
  instantiateExercise,
  sampleDisplayGraph,
  projectPublicInstance,
} from 'novlearn-exercise-engine';
import type {
  DisplayElement,
  ExerciseDefinition,
  ExerciseInstance,
  DisplayGraph,
} from 'novlearn-exercise-engine';
const n = (latex: string) => ({ latex });
const window = () => ({
  xMin: n('-2'),
  xMax: n('2'),
  yMin: n('-10'),
  yMax: n('10'),
});
const graph = (latex: string): DisplayElement => ({
  id: 'g',
  type: 'function-graph',
  variable: 'x',
  window: window(),
  showGrid: true,
  functions: [{ id: 'f', latex, color: '#2563eb', showExpression: true }],
});
function official(element: DisplayElement): ExerciseInstance {
  const definition: ExerciseDefinition = {
    schemaVersion: 5,
    kind: 'composed',
    id: 'graph-test',
    revision: '1',
    title: 'Graph test',
    generation: {
      schemaVersion: 5,
      definitions: [
        { name: 'a', kind: 'integer', min: 3, max: 3, exclusions: [] },
      ],
      constraints: [],
      maxAttempts: 4,
      maxDraws: 16,
    },
    variables: [
      { name: 'x', domain: 'real' },
      { name: 'n', domain: 'integer' },
      { name: 'u', domain: 'real' },
    ],
    elements: [
      element,
      {
        id: 'private',
        type: 'question',
        text: 'PRIVATE_PROMPT',
        points: 1,
        response: { format: 'latex', kind: 'rational' },
        expectedLatex: '987654321',
        policy: { domain: 'rational', form: 'value-only' },
      },
    ],
  };
  const result = instantiateExercise(definition, {
    seed: 42,
    instanceId: 'official-graph',
  });
  if (!result.ok) throw Error(JSON.stringify(result.diagnostics));
  return result.value;
}
async function sampled(instance: ExerciseInstance): Promise<DisplayGraph> {
  const r = await sampleDisplayGraph(instance, 'g');
  if (!r.ok) throw Error(r.error);
  return r.value;
}
const seq = (
  sequence: Extract<DisplayElement, { type: 'sequence-graph' }>['sequence'],
): DisplayElement => ({
  id: 'g',
  type: 'sequence-graph',
  window: window(),
  showGrid: true,
  connectPoints: true,
  sequence,
});
describe('official bounded graph samples', () => {
  it('charges point guards and interval guards even when their proofs are reused', async () => {
    const g = graph('1/(x+3)');
    if (g.type !== 'function-graph') throw Error();
    g.functions.push({ ...g.functions[0]!, id: 'second' });
    const r = await sampled(official(g));
    expect(r.state).toBe('complete');
    expect(
      r.series.every((s) => s.points.length === 65 && s.segments.length === 64),
    ).toBe(true);
    // Per series: one admission guard, 65 value + 65 point guards, 64 interval guards.
    expect(r.evaluations).toBe(2 * (1 + 65 + 65 + 64));
  });
  it('reports a technical digest failure as unavailable without exposing its details', async () => {
    const instance = official(graph('x'));
    const digest = vi
      .spyOn(globalThis.crypto.subtle, 'digest')
      .mockRejectedValueOnce(new Error('PRIVATE_FAILURE'));
    try {
      expect(await sampleDisplayGraph(instance, 'g')).toEqual({
        ok: false,
        error: 'unavailable',
      });
    } finally {
      digest.mockRestore();
    }
  });
  it('rejects a corrupted window and refuses unsupported raw syntax', async () => {
    const instance = official(graph('x'));
    const element = instance.elements[0];
    if (element?.type !== 'function-graph') throw Error();
    element.window.xMax = structuredClone(element.window.xMin);
    expect(await sampleDisplayGraph(instance, 'g')).toEqual({
      ok: false,
      error: 'invalid-instance',
    });
    const other = official(graph('x'));
    const selected = other.elements[0];
    if (selected?.type !== 'function-graph') throw Error();
    const field = selected.mathFields.find((f) =>
      f.path.endsWith('/functions/0/latex'),
    );
    if (!field) throw Error();
    field.math.substituted = ['Complex', 0, 1];
    const r = await sampled(other);
    expect(r.state).toBe('unsupported');
    expect(r.series[0]?.points).toHaveLength(0);
    expect(r.diagnostics).toEqual([
      { seriesId: 'f', code: 'unsupported-expression' },
    ]);
  });
  it.each([
    ['3', (x: number) => 3 + 0 * x],
    ['ax+1', (x: number) => 3 * x + 1],
    ['x^2', (x: number) => x * x],
    ['\\sin(x)', (x: number) => Math.sin(x)],
    ['\\cos(x)', (x: number) => Math.cos(x)],
    ['\\exp(x)', (x: number) => Math.exp(x)],
    ['\\left|x\\right|', (x: number) => Math.abs(x)],
  ])('samples %s through the official instance', async (latex, oracle) => {
    const value = await sampled(official(graph(latex as string)));
    expect(value.state).toBe('complete');
    expect(value.series[0]!.points).toHaveLength(65);
    expect(value.series[0]!.segments).toHaveLength(64);
    for (const p of value.series[0]!.points)
      expect(p.y).toBeCloseTo((oracle as (x: number) => number)(p.x), 12);
    expect(value.formulaDomain).toBe('unverified');
    expect(value.approximation).toBe('numeric');
  });
  it.each(['1/x', '(x^2-1)/(x-1)'])(
    'preserves the raw hole of %s',
    async (latex) => {
      const result = await sampled(official(graph(latex)));
      expect(result.state).toBe('partial');
      const hole = latex === '1/x' ? 0 : 1;
      const line = result.series[0]!;
      expect(line.points.some((p) => p.x === hole)).toBe(false);
      for (const [a, b] of line.segments)
        expect(line.points[a]!.x < hole && line.points[b]!.x > hole).toBe(
          false,
        );
      expect(result.diagnostics.some((d) => d.code === 'domain-gap')).toBe(
        true,
      );
    },
  );
  it('never bridges a pole between two sampled coordinates', async () => {
    const result = await sampled(official(graph('1/(x-1/3)')));
    const line = result.series[0]!;
    expect(result.state).toBe('partial');
    expect(line.points).toHaveLength(65);
    expect(
      line.segments.some(
        ([a, b]) => line.points[a]!.x < 1 / 3 && line.points[b]!.x > 1 / 3,
      ),
    ).toBe(false);
    expect(
      result.diagnostics.some(
        (d) => d.code === 'domain-gap' && d.fromSample !== undefined,
      ),
    ).toBe(true);
  });
  it.each(['\\sqrt{x}', '\\ln(x)'])(
    'keeps the real domain boundary of %s',
    async (latex) => {
      const result = await sampled(official(graph(latex)));
      const line = result.series[0]!;
      expect(result.state).toBe('partial');
      expect(line.points.length).toBeGreaterThan(1);
      expect(
        line.points.every((p) => (latex.includes('ln') ? p.x > 0 : p.x >= 0)),
      ).toBe(true);
      for (const p of line.points)
        expect(p.y).toBeCloseTo(
          latex.includes('ln') ? Math.log(p.x) : Math.sqrt(p.x),
          12,
        );
    },
  );
  it('does not turn undefined raw descendants into zero', async () => {
    const result = await sampled(official(graph('0*(1/0)')));
    expect(result.state).toBe('unsupported');
    expect(result.series[0]!.points).toEqual([]);
  });
  it('distinguishes a nonfinite approximation from a numeric answer', async () => {
    const result = await sampled(official(graph('\\exp(1000)')));
    expect(result.state).toBe('unsupported');
    expect(result.diagnostics.every((d) => d.code === 'non-finite')).toBe(true);
  });
  it('calculates all 64 explicit terms from a nonzero first index', async () => {
    const result = await sampled(
      official(
        seq({
          mode: 'explicit',
          indexVariable: 'n',
          start: 3,
          count: 64,
          latex: 'n^2',
        }),
      ),
    );
    expect(result.state).toBe('complete');
    expect(result.series[0]!.points).toHaveLength(64);
    for (const p of result.series[0]!.points) expect(p.y).toBe(p.x * p.x);
  });
  it('keeps the recurrence initial term and previous index', async () => {
    const result = await sampled(
      official(
        seq({
          mode: 'recurrent',
          indexVariable: 'n',
          termVariable: 'u',
          start: 3,
          count: 6,
          initial: n('1'),
          recurrence: 'u+n',
        }),
      ),
    );
    expect(result.state).toBe('complete');
    expect(result.series[0]!.points.map((p) => [p.x, p.y])).toEqual([
      [3, 1],
      [4, 4],
      [5, 8],
      [6, 13],
      [7, 19],
      [8, 26],
    ]);
  });
  it('does not evaluate an unused recurrence for a one-term sequence', async () => {
    const result = await sampled(
      official(
        seq({
          mode: 'recurrent',
          indexVariable: 'n',
          termVariable: 'u',
          start: 0,
          count: 1,
          initial: n('1'),
          recurrence: '1/(u-1)',
        }),
      ),
    );
    expect(result.state).toBe('complete');
    expect(result.series[0]!.points.map((p) => p.y)).toEqual([1]);
  });
  it('propagates an undefined recurrence without manufacturing later terms', async () => {
    const result = await sampled(
      official(
        seq({
          mode: 'recurrent',
          indexVariable: 'n',
          termVariable: 'u',
          start: 0,
          count: 4,
          initial: n('1'),
          recurrence: '1/(u-1)',
        }),
      ),
    );
    expect(result.state).toBe('partial');
    expect(result.series[0]!.points.map((p) => p.y)).toEqual([1]);
    expect(result.diagnostics).toEqual([
      { seriesId: 'g', code: 'domain-gap', sample: 1 },
      { seriesId: 'g', code: 'dependent-term', sample: 2 },
      { seriesId: 'g', code: 'dependent-term', sample: 3 },
    ]);
  });
  it('retains prescribed point rendering', async () => {
    const result = await sampled(
      official(
        seq({
          mode: 'points',
          points: [
            { index: 1, value: n('1/3') },
            { index: 3, value: n('2') },
          ],
        }),
      ),
    );
    expect(result.state).toBe('complete');
    expect(result.series[0]!.points.map((p) => [p.x, p.y])).toEqual([
      [1, 1 / 3],
      [3, 2],
    ]);
  });
  it('samples the full sixteen-function element', async () => {
    const g = graph('x');
    if (g.type !== 'function-graph') throw Error();
    g.functions = Array.from({ length: 16 }, (_, i) => ({
      id: 'f' + i,
      latex: `${i + 1}x+1`,
      color: '#2563eb',
      showExpression: true,
    }));
    const result = await sampled(official(g));
    expect(result.state).toBe('complete');
    expect(result.series).toHaveLength(16);
    for (const [i, line] of result.series.entries()) {
      expect(line.points).toHaveLength(65);
      for (const p of line.points)
        expect(p.y).toBeCloseTo((i + 1) * p.x + 1, 12);
    }
    expect(result.evaluations).toBeLessThanOrEqual(2048);
  });
  it('reports the evaluation budget and retains every series', async () => {
    const g = graph('1/x+1/(x-1)+1/(x+1)');
    if (g.type !== 'function-graph') throw Error();
    g.functions = Array.from({ length: 16 }, (_, i) => ({
      ...g.functions[0]!,
      id: 'f' + i,
    }));
    const result = await sampled(official(g));
    expect(result.state).toBe('partial');
    expect(result.evaluations).toBe(2048);
    expect(result.series).toHaveLength(16);
    expect(result.diagnostics.some((d) => d.code === 'budget-limit')).toBe(
      true,
    );
  });
  it('keeps snapshots and their existing projection byte-identical, with detached public output', async () => {
    const instance = official(graph('ax+1'));
    const before = JSON.stringify(instance),
      projection = JSON.stringify(projectPublicInstance(instance));
    const first = await sampled(instance),
      second = await sampled(instance);
    expect(second).toEqual(first);
    expect(JSON.stringify(instance)).toBe(before);
    expect(JSON.stringify(projectPublicInstance(instance))).toBe(projection);
    const raw = JSON.stringify(first);
    for (const secret of [
      'PRIVATE_PROMPT',
      '987654321',
      'mathFields',
      'substituted',
      'expected',
      'generation',
      'policy',
    ])
      expect(raw).not.toContain(secret);
    first.series[0]!.points[0]!.y = 999;
    expect(await sampled(instance)).toEqual(second);
  });
  it('keeps the budget refusal for sixteen distinct numerators sharing only domain proofs', async () => {
    const g = graph('1/x');
    if (g.type !== 'function-graph') throw Error();
    g.functions = Array.from({ length: 16 }, (_, i) => ({
      id: 'f' + i,
      latex: `${i + 1}/x+${i + 2}/(x-1)+${i + 3}/(x+1)`,
      color: '#2563eb',
      showExpression: true,
    }));
    const result = await sampled(official(g));
    expect(result.state).toBe('partial');
    expect(result.evaluations).toBe(2048);
    expect(result.series).toHaveLength(16);
    expect(result.diagnostics.some((d) => d.code === 'budget-limit')).toBe(
      true,
    );
  });
  it('never reuses a domain proof across sampling calls with different generated parameters', async () => {
    const first = official(graph('1/(x-a)'));
    const changed = instantiateExercise(
      {
        ...first.definition,
        generation: {
          ...first.definition.generation,
          definitions: [
            { name: 'a', kind: 'integer', min: 1, max: 1, exclusions: [] },
          ],
        },
      },
      { seed: 42, instanceId: 'another-graph' },
    );
    if (!changed.ok) throw Error(JSON.stringify(changed.diagnostics));
    const a = await sampled(first),
      b = await sampled(changed.value),
      again = await sampled(first);
    expect(a.state).toBe('complete');
    expect(b.state).toBe('partial');
    expect(b.series[0]!.points.some((p) => p.x === 1)).toBe(false);
    expect(again).toEqual(a);
    expect(b.sourceSha256).not.toBe(a.sourceSha256);
  });
  it('rejects a stale version, unknown element and profile', async () => {
    const instance = official(graph('x'));
    expect(
      await sampleDisplayGraph(
        { ...instance, schemaVersion: 4 } as unknown as ExerciseInstance,
        'g',
      ),
    ).toEqual({ ok: false, error: 'invalid-instance' });
    expect(await sampleDisplayGraph(instance, 'missing')).toEqual({
      ok: false,
      error: 'invalid-element',
    });
    expect(await sampleDisplayGraph(instance, 'private')).toEqual({
      ok: false,
      error: 'invalid-element',
    });
    expect(await sampleDisplayGraph(instance, 'g', 'unknown' as never)).toEqual(
      { ok: false, error: 'invalid-profile' },
    );
  });
});
