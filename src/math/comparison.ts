import { ComputeEngine } from '@cortex-js/compute-engine';
import type { GeneratedValue } from '../contracts/types.js';
import { exactNumber } from '../contracts/generation.js';

/** Isolated, closed numeric comparison only. Boxed values never leave this boundary. */
export function numericOrder(): (
  a: GeneratedValue,
  b: GeneratedValue,
) => -1 | 0 | 1 | undefined {
  const ce = new ComputeEngine({ tolerance: 0 });
  ce.iterationLimit = 1024;
  ce.recursionLimit = 64;
  const box = (value: GeneratedValue) => {
    if (value.kind === 'rational')
      return ce.box(['Rational', value.numerator, value.denominator]);
    const n = value.kind === 'decimal' ? value : exactNumber(value.value);
    if (!n) throw new Error('Missing validated exact numeric encoding.');
    return ce.box(
      n.precision === 0
        ? n.coefficient
        : ['Rational', n.coefficient, 10 ** n.precision],
    );
  };
  return (a, b) => {
    const x = box(a);
    const y = box(b);
    // Canonical closed integer/rational literals, never an identity claim over symbols.
    if (x.isSame(y)) return 0;
    if (x.isLess(y) === true) return -1;
    if (x.isGreater(y) === true) return 1;
    return undefined;
  };
}
