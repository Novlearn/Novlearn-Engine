import { describe, expect, it } from 'vitest';
/** Independent BigInt series oracle, never imported by the engine. */
type Ratio = readonly [bigint, bigint];
const add = (a: Ratio, b: Ratio): Ratio => [
  a[0] * b[1] + b[0] * a[1],
  a[1] * b[1],
];
const scale = (a: Ratio, n: bigint): Ratio => [a[0] * n, a[1]];
const less = (a: Ratio, b: Ratio): boolean => a[0] * b[1] < b[0] * a[1];
function atanBounds(q: bigint): readonly [Ratio, Ratio] {
  let sum: Ratio = [0n, 1n];
  for (let k = 0n; k < 10n; k++)
    sum = add(sum, [
      k % 2n === 0n ? 1n : -1n,
      (2n * k + 1n) * q ** (2n * k + 1n),
    ]);
  // Ten alternating terms end below atan(1/q); the next positive term is an upper bound.
  return [sum, add(sum, [1n, 21n * q ** 21n])];
}
describe('independent certification of M3 coarse constant bounds', () => {
  it('proves the six-decimal pi bracket by Machin and alternating-series remainders', () => {
    // tan(4 atan(1/5))=120/119; tan(4 atan(1/5)-atan(1/239))=1.
    // 0 < 4 atan(1/5)-atan(1/239) < 4/5 < pi/2 fixes the pi/4 branch.
    expect(120n * 239n - 119n).toBe(119n * 239n + 120n);
    const five = atanBounds(5n),
      large = atanBounds(239n);
    const low = add(scale(five[0], 16n), scale(large[1], -4n));
    const high = add(scale(five[1], 16n), scale(large[0], -4n));
    expect(less([3_141_592n, 1_000_000n], low)).toBe(true);
    expect(less(high, [3_141_593n, 1_000_000n])).toBe(true);
  });
  it('proves the e bracket by the factorial series and a geometric tail bound', () => {
    let sum: Ratio = [1n, 1n];
    let factorial = 1n;
    for (let k = 1n; k <= 12n; k++) {
      factorial *= k;
      sum = add(sum, [1n, factorial]);
    }
    // Subsequent ratios <=1/13, hence tail <= (1/13!)/(1-1/13).
    const upper = add(sum, [1n, 12n * factorial]);
    expect(less([2_718_281n, 1_000_000n], sum)).toBe(true);
    expect(less(upper, [2_718_282n, 1_000_000n])).toBe(true);
  });
});
