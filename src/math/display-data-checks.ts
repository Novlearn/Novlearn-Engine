import type {
  DisplayElementData,
  Endpoint,
  RenderNumber,
} from '../contracts/elements.js';
import { MathFailure } from './substitution.js';

function compare(a: RenderNumber, b: RenderNumber): number {
  const difference =
    BigInt(a.numerator) * BigInt(b.denominator) -
    BigInt(b.numerator) * BigInt(a.denominator);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
function endpointCompare(
  a: Endpoint<RenderNumber>,
  b: Endpoint<RenderNumber>,
): number {
  if (a.kind === b.kind && a.kind !== 'finite') return 0;
  if (a.kind === 'negative-infinity' || b.kind === 'positive-infinity')
    return -1;
  if (a.kind === 'positive-infinity' || b.kind === 'negative-infinity')
    return 1;
  return a.kind === 'finite' && b.kind === 'finite'
    ? compare(a.value, b.value)
    : 0;
}

/** Exact prescribed-data checks, without deriving signs, roots or geometry. */
export function checkDisplayData(
  e: DisplayElementData<RenderNumber>,
  path: string,
): void {
  const fail: (p: string, message: string) => never = (p, message) => {
    throw new MathFailure({
      code: 'undefined-expression',
      path: `${path}${p}`,
      message,
    });
  };
  if ('window' in e) {
    if (
      compare(e.window.xMin, e.window.xMax) >= 0 ||
      compare(e.window.yMin, e.window.yMax) >= 0
    )
      fail('/window', 'Window bounds must be finite and strictly increasing.');
  }
  if (e.type === 'sign-table' || e.type === 'variation-table') {
    const points =
      e.type === 'sign-table' ? e.points : e.points.map((p) => p.x);
    for (let i = 1; i < points.length; i++)
      if (endpointCompare(points[i - 1]!, points[i]!) >= 0)
        fail(
          `/points/${i}`,
          'Abscissas must be strictly increasing by exact comparison.',
        );
    if (e.type === 'variation-table')
      e.points.forEach((p, i) => {
        if (p.value && p.value.kind !== 'finite')
          fail(
            `/points/${i}/value`,
            'Defined values must be finite; use one-sided fields for infinite limits.',
          );
        if (p.x.kind === 'negative-infinity' && p.leftLimit)
          fail(
            `/points/${i}/leftLimit`,
            'No left-hand limit at negative infinity.',
          );
        if (p.x.kind === 'positive-infinity' && p.rightLimit)
          fail(
            `/points/${i}/rightLimit`,
            'No right-hand limit at positive infinity.',
          );
        if (p.x.kind !== 'finite' && !p.excluded)
          fail(
            `/points/${i}/excluded`,
            'Infinite abscissas are excluded endpoints.',
          );
      });
    if (e.type === 'variation-table')
      for (let i = 0; i < e.directions.length; i++) {
        const left = e.points[i]!,
          right = e.points[i + 1]!;
        const a = left.rightLimit ?? left.value,
          b = right.leftLimit ?? right.value;
        if (!a || !b) {
          fail(
            `/directions/${i}`,
            'Interval endpoints require prescribed values or one-sided limits.',
          );
        }
        const order = endpointCompare(a, b),
          direction = e.directions[i];
        if (
          (direction === 'constant' &&
            (a.kind !== 'finite' || b.kind !== 'finite')) ||
          (direction === 'increasing' &&
            (a.kind === 'positive-infinity' ||
              b.kind === 'negative-infinity')) ||
          (direction === 'decreasing' &&
            (a.kind === 'negative-infinity' || b.kind === 'positive-infinity'))
        )
          fail(
            `/directions/${i}`,
            'Infinite one-sided limits contradict a real-valued prescribed variation.',
          );
        if (
          (direction === 'increasing' && order > 0) ||
          (direction === 'decreasing' && order < 0) ||
          (direction === 'constant' && order !== 0)
        )
          fail(
            `/directions/${i}`,
            'Variation contradicts its prescribed endpoint values/limits.',
          );
      }
  }
  if (e.type === 'statistics-table')
    e.rows.forEach((r, i) => {
      if (r.frequency.numerator < 0 || r.frequency.denominator !== 1)
        fail(
          `/rows/${i}/frequency`,
          'Frequencies are nonnegative integer counts in this profile.',
        );
    });
  if (e.type === 'probability-tree') {
    const groups = new Map<string, RenderNumber[]>();
    e.nodes.forEach((n, i) => {
      if (!n.probability || n.parentId === undefined) return;
      if (
        n.probability.numerator < 0 ||
        n.probability.numerator > n.probability.denominator
      )
        fail(
          `/nodes/${i}/probability`,
          'Edge probabilities must lie in [0,1].',
        );
      const group = groups.get(n.parentId) ?? [];
      group.push(n.probability);
      groups.set(n.parentId, group);
    });
    for (const group of groups.values()) {
      // At most 64 fractions with <=10^9 denominator: bounded exact integer witness.
      const denominator = group.reduce(
        (product, n) => product * BigInt(n.denominator),
        1n,
      );
      const numerator = group.reduce(
        (sum, n) =>
          sum + BigInt(n.numerator) * (denominator / BigInt(n.denominator)),
        0n,
      );
      if (
        (e.exhaustive && numerator !== denominator) ||
        numerator > denominator
      )
        fail(
          '/nodes',
          'Outgoing probabilities must sum to at most one, exactly one when exhaustive.',
        );
    }
  }
  if (e.type === 'geometry')
    e.objects.forEach((o, i) => {
      if (o.kind === 'line') {
        const a = e.points.find((p) => p.id === o.from),
          b = e.points.find((p) => p.id === o.to);
        if (
          a &&
          b &&
          a.coordinates.every((n, j) => compare(n, b.coordinates[j]!) === 0)
        )
          fail(
            `/objects/${i}`,
            'A line requires two geometrically distinct points.',
          );
      }
      if (o.kind === 'circle' && o.radius.numerator <= 0)
        fail(`/objects/${i}/radius`, 'Circle radius must be positive.');
    });
}
