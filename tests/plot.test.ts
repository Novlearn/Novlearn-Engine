import { expect, it } from 'vitest';
import { instantiateExercise, projectPublicInstance } from '../src/index.js';
import type { ExerciseDefinition } from '../src/index.js';
const definition = (latex: string): ExerciseDefinition => ({
  schemaVersion: 5,
  kind: 'composed',
  id: 'plot',
  revision: '1',
  title: 'Courbe',
  generation: {
    schemaVersion: 5,
    definitions: [],
    constraints: [],
    maxAttempts: 1,
    maxDraws: 1,
  },
  variables: [{ name: 'x', domain: 'real' }],
  elements: [
    {
      id: 'g',
      type: 'function-graph',
      variable: 'x',
      window: {
        xMin: { latex: '-1' },
        xMax: { latex: '1' },
        yMin: { latex: '-3' },
        yMax: { latex: '3' },
      },
      showGrid: true,
      functions: [{ id: 'f', latex, color: '#3366cc', showExpression: true }],
    },
  ],
});
function graph(latex: string) {
  const instance = instantiateExercise(definition(latex), {
    seed: 42,
    instanceId: 'plot',
  });
  if (!instance.ok) throw Error(JSON.stringify(instance.diagnostics));
  const before = JSON.stringify(instance.value);
  const projected = projectPublicInstance(instance.value, {
    sampleGraphs: true,
  });
  expect(JSON.stringify(instance.value)).toBe(before);
  expect(JSON.stringify(projected)).not.toMatch(
    /"(?:expected|definition|generation|mathFields|syntax)"\s*:/,
  );
  const element = projected.elements[0];
  if (element?.type !== 'function-graph' || !element.plot)
    throw Error('Missing plot');
  expect(element.plot.values[0]).toHaveLength(513);
  const oldProjection = projectPublicInstance(instance.value).elements[0];
  expect(oldProjection).not.toHaveProperty('plot');
  return element.plot.values[0]!;
}
it('samples exact arithmetic and decimal notation for rendering only', () => {
  const values = graph(String.raw`\frac{4}{2}x+0{,}25`);
  expect(values[0]).toBeCloseTo(-1.75, 12);
  expect(values[256]).toBe(0.25);
  expect(values[512]).toBeCloseTo(2.25, 12);
});
it('preserves real odd roots on both sides of zero', () => {
  const values = graph(String.raw`(x/3)\sqrt[3]{x^2}-2\sqrt[3]{x}`);
  expect(values[0]).toBeCloseTo(5 / 3, 12);
  expect(values[256]).toBe(0);
  expect(values[512]).toBeCloseTo(-5 / 3, 12);
});
it('keeps poles and excluded real-domain points as gaps', () => {
  expect(graph('x/x')[256]).toBeNull();
  const values = graph(String.raw`\sqrt{x}`);
  expect(values[0]).toBeNull();
  expect(values[256]).toBe(0);
  expect(values[512]).toBe(1);
});
