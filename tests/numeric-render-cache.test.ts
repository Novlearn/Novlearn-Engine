import { describe, expect, it } from 'vitest';
import {
  instantiateExercise,
  projectPublicInstance,
} from 'novlearn-exercise-engine';
import type {
  ExerciseDefinition,
  ExerciseElement,
  ExerciseInstance,
  PrivateDisplayElement,
} from 'novlearn-exercise-engine';
const n = (latex: string) => ({ latex });
function definition(a = 2, tableValue = 'a+1'): ExerciseDefinition {
  return {
    schemaVersion: 5,
    kind: 'composed',
    id: 'numeric-render-isolation',
    revision: '1',
    title: 'Cache isolation',
    generation: {
      schemaVersion: 5,
      definitions: [
        { name: 'a', kind: 'integer', min: a, max: a, exclusions: [] },
      ],
      constraints: [],
      maxAttempts: 4,
      maxDraws: 16,
    },
    variables: [{ name: 'x', domain: 'real' }],
    elements: [
      {
        id: 'v',
        type: 'vectors',
        dimension: 2,
        showCoordinates: true,
        vectors: [
          {
            id: 'u',
            label: 'u',
            color: '#2563eb',
            coordinates: [n('a+1'), n('a+1')],
          },
          {
            id: 'w',
            label: 'w',
            color: '#6366f1',
            coordinates: [n('a+1'), n('(a+1)')],
          },
        ],
      },
      {
        id: 't',
        type: 'value-table',
        columns: ['Valeur'],
        rows: [[{ kind: 'number', value: n(tableValue) }]],
      },
    ],
  };
}
function run(d = definition()): ExerciseInstance {
  const result = instantiateExercise(d, {
    seed: 42,
    instanceId: 'cache-fixture',
  });
  if (!result.ok) throw Error(JSON.stringify(result));
  return result.value;
}
const display = (i: ExerciseInstance, id: string) =>
  i.elements.find((e) => e.id === id) as PrivateDisplayElement;
describe('numeric render reuse remains local and transparent', () => {
  it('preserves the exact result, original spelling, and provenance at each repeated field path', () => {
    const original = definition();
    const before = JSON.stringify(original);
    const instance = run(original);
    expect(JSON.stringify(original)).toBe(before);
    const vector = display(instance, 'v'),
      table = display(instance, 't');
    expect(vector.mathFields.map((f) => f.path)).toEqual([
      '/elements/0/vectors/0/coordinates/0/latex',
      '/elements/0/vectors/0/coordinates/1/latex',
      '/elements/0/vectors/1/coordinates/0/latex',
      '/elements/0/vectors/1/coordinates/1/latex',
    ]);
    expect(vector.mathFields.map((f) => f.math.source)).toEqual([
      'a+1',
      'a+1',
      'a+1',
      '(a+1)',
    ]);
    expect(table.mathFields[0]!.path).toBe('/elements/1/rows/0/0/value/latex');
    expect(table.mathFields[0]!.math).toEqual(vector.mathFields[0]!.math);
    if (vector.type !== 'vectors') throw Error('vectors required');
    expect(vector.vectors[0]!.coordinates).toEqual([
      { numerator: 3, denominator: 1, latex: '3' },
      { numerator: 3, denominator: 1, latex: '3' },
    ]);
    expect(projectPublicInstance(instance)).toEqual(
      projectPublicInstance(run(original)),
    );
  });
  it('returns detached math objects and nested syntax at every occurrence and public projection', () => {
    const instance = run(),
      vector = display(instance, 'v'),
      table = display(instance, 't');
    const one = vector.mathFields[0]!.math,
      two = vector.mathFields[1]!.math,
      other = table.mathFields[0]!.math;
    expect(one).not.toBe(two);
    expect(one.syntax).not.toBe(two.syntax);
    expect(one.substituted).not.toBe(two.substituted);
    const unchanged = JSON.stringify({ two, other });
    if (Array.isArray(one.syntax)) one.syntax[1] = 'mutated';
    if (Array.isArray(one.substituted)) one.substituted[1] = 999;
    one.source = 'mutated';
    expect(JSON.stringify({ two, other })).toBe(unchanged);
    const projected = projectPublicInstance(instance);
    const first = projected.elements[0];
    if (first?.type !== 'vectors') throw Error('vectors required');
    first.vectors[0]!.coordinates[0]!.latex = 'mutated';
    expect(JSON.stringify(projectPublicInstance(run()))).not.toContain(
      'mutated',
    );
  });
  it('never reuses generated parameter values between calls or definitions', () => {
    const first = run(definition(2)),
      second = run(definition(7)),
      third = run(definition(2));
    const a = display(first, 'v'),
      b = display(second, 'v');
    if (a.type !== 'vectors' || b.type !== 'vectors')
      throw Error('vectors required');
    expect(a.vectors[0]!.coordinates[0]!.numerator).toBe(3);
    expect(b.vectors[0]!.coordinates[0]!.numerator).toBe(8);
    expect(third).toEqual(first);
  });
  it('does not preserve success across a later zero-denominator failure and keeps its current path', () => {
    const first = run(definition(2, '1/a'));
    expect(display(first, 't').mathFields[0]!.math.source).toBe('1/a');
    const bad = instantiateExercise(definition(0, '1/a'), {
      seed: 42,
      instanceId: 'bad',
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) throw Error('Undefined quotient must fail');
    expect(
      bad.diagnostics.some(
        (d) =>
          d.path.startsWith('/elements/1/rows/0/0/value/latex') &&
          d.stage === 'statement',
      ),
    ).toBe(true);
    expect(bad).not.toHaveProperty('value');
    expect(run(definition(2, '1/a'))).toEqual(first);
  });
  it('keeps domain admission for new sources and never reduces an undefined field through a cached zero', () => {
    const d = definition();
    d.elements = [
      {
        id: 't',
        type: 'value-table',
        columns: ['Valeur'],
        rows: [
          [{ kind: 'number', value: n('0') }],
          [{ kind: 'number', value: n('0/0') }],
        ],
      },
    ];
    const bad = instantiateExercise(d, { seed: 42, instanceId: 'domain' });
    expect(bad.ok).toBe(false);
    if (bad.ok) throw Error('Undefined source must fail');
    expect(
      bad.diagnostics.some(
        (diag) =>
          diag.path.startsWith('/elements/0/rows/1/0/value/latex') &&
          diag.stage === 'statement',
      ),
    ).toBe(true);
    expect(bad).not.toHaveProperty('value');
  });
  it('does not turn a presentation formula with the same spelling into exact numeric admission', () => {
    const d = definition(2, 'a');
    const graph: ExerciseElement = {
      id: 'f',
      type: 'function-graph',
      variable: 'x',
      showGrid: false,
      window: { xMin: n('-5'), xMax: n('5'), yMin: n('-5'), yMax: n('5') },
      functions: [
        { id: 'f', latex: 'a', color: '#2563eb', showExpression: true },
      ],
    };
    d.elements.push(graph);
    const instance = run(d),
      formula = display(instance, 'f');
    expect(
      formula.mathFields.find((f) => f.path === '/elements/2/functions/0/latex')
        ?.admission,
    ).toBe('display-only');
    expect(formula.formulaDomain).toBe('unverified');
    expect(display(instance, 't').mathFields[0]!.admission).toBe(
      'exact-rational',
    );
  });
});
