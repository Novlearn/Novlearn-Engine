import { describe, expect, it, vi } from 'vitest';
import { CancellationError, ComputeEngine } from '@cortex-js/compute-engine';
import { instantiateMath } from '../src/math/substitution.js';
import type { GeneratedValue } from '../src/contracts/types.js';
const values: Record<string, GeneratedValue> = {
  a: { kind: 'integer', value: -2 },
  b: { kind: 'integer', value: 3 },
  c: { kind: 'decimal', coefficient: 125, precision: 2 },
  d: { kind: 'choice', value: 0.1 },
};
const context = { parameters: ['a', 'b', 'c', 'd'], variables: ['x'] };
function math(source: string, scalar = true) {
  return instantiateMath(source, context, values, '/math', scalar);
}
describe('bounded CortexJS substitution', () => {
  it.each([
    ['a^2', 4, 1],
    ['-a^2', -4, 1],
    ['(a+b)^2', 1, 1],
    ['ab', -6, 1],
    ['\\frac{a}{b}', -2, 3],
    ['c', 5, 4],
    ['c^2', 25, 16],
    ['c+d', 27, 20],
    ['0.1+0.2', 3, 10],
    ['1{,}25', 5, 4],
    ['.5', 1, 2],
    ['1e-6', 1, 1000000],
    ['\\frac{1}{3}+\\frac{1}{6}', 1, 2],
    ['a-bc', -23, 4],
    ['a^2+b^2', 13, 1],
  ])('computes %s exactly as %s/%s', (source, numerator, denominator) => {
    const result = math(source);
    expect(result).toMatchObject({
      ok: true,
      exact: { kind: 'rational', numerator, denominator },
    });
    if (result.ok) expect(result.value.source).toBe(source);
  });
  it('preserves negative powers/parentheses in raw substitution', () => {
    const squared = math('a^2');
    const negated = math('-a^2');
    if (!squared.ok || !negated.ok) throw new Error('Instantiation failed');
    expect(squared.value.substituted).toEqual(['Power', -2, 2]);
    expect(negated.value.substituted).toEqual(['Negate', ['Power', -2, 2]]);
    expect(squared.value.displayLatex).toBe('4');
    expect(negated.value.displayLatex).toBe('-4');
  });
  it('preserves free variables and prepares readable coefficients', () => {
    const result = instantiateMath(
      'a\\frac{1}{2}x+2',
      { parameters: ['a'], variables: ['x'] },
      { a: { kind: 'integer', value: 4 } },
      '/math',
      false,
    );
    expect(result).toMatchObject({ ok: true, value: { displayLatex: '2x+2' } });
    expect(result).not.toHaveProperty('exact');
    const negative = math('a x^2+b x+c', false);
    expect(negative).toMatchObject({
      ok: true,
      value: { displayLatex: '-2x^2+3x+\\frac{5}{4}' },
    });
  });
  it('distinguishes adjacent names as symbols, without substring substitution', () => {
    expect(math('ab')).toMatchObject({
      ok: true,
      exact: { numerator: -6, denominator: 1 },
    });
    expect(math('z+a')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'unknown-symbol', symbol: 'z' }],
    });
    expect(
      instantiateMath('a', { parameters: ['a'] }, {}, '/field', true),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'missing-variable', path: '/field' }],
    });
    expect(
      instantiateMath('a', { parameters: ['ab'] }, values, '/field', true),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'invalid-context' }] });
  });
  it('accepts a closed, nonzero denominator without cancelling an unknown domain', () => {
    expect(math('(x+1)/(b-a)', false)).toMatchObject({ ok: true });
    expect(math('0/(b-b)', false)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'undefined-expression' }],
    });
    expect(math('(x/x)^0', false)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'unsupported' }],
    });
  });
  it.each(['.123456000000000000000001', '1{,}000000000001', '1.0000001'])(
    'rejects decimal precision before exact encoding: %s',
    (source) => {
      expect(math(source)).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'limit' }],
      });
    },
  );
  it.each([
    '1.000000\\,000000\\,000000\\,0000001',
    '1.000000 000000 000000 0000001',
    '1{,}000000\\;0000001',
    '10\\,000',
  ])(
    'rejects grouped digits before a rounded parser literal can claim exactness: %s',
    (source) => {
      expect(math(source)).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'unsupported' }],
      });
    },
  );
  it('enforces structure, degree and exact arithmetic budgets', () => {
    expect(math('x^{16}x', false)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'limit' }],
    });
    expect(math('a+a+'.repeat(65) + 'a')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'limit' }],
    });
    expect(math('999999999^2')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'limit' }],
    });
  });
  it('fixes symbolic implicit products before fraction substitution and rejects numeric ambiguity', () => {
    expect(math('bc')).toMatchObject({
      ok: true,
      exact: { numerator: 15, denominator: 4 },
    });
    expect(math('a-bc')).toMatchObject({
      ok: true,
      exact: { numerator: -23, denominator: 4 },
    });
    expect(math('a-b\\cdot c')).toMatchObject({
      ok: true,
      exact: { numerator: -23, denominator: 4 },
    });
    expect(math('3\\frac{1}{4}')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'unsupported' }],
    });
    expect(math('3\\cdot\\frac{1}{4}')).toMatchObject({
      ok: true,
      exact: { numerator: 3, denominator: 4 },
    });
  });
  it.each([
    [new Error('internal secret'), 'substitution-failed'],
    [new CancellationError({ cause: 'step-budget' }), 'limit'],
  ])(
    'sanitizes library failures and detected budget exhaustion',
    (error, code) => {
      const ce = new ComputeEngine();
      const prototype = Object.getPrototypeOf(
        ce.parse('a+1', { form: 'raw' }),
      ) as { subs: () => unknown };
      const mock = vi.spyOn(prototype, 'subs').mockImplementation(() => {
        throw error;
      });
      try {
        const result = math('a+1');
        expect(result).toMatchObject({ ok: false, diagnostics: [{ code }] });
        expect(JSON.stringify(result)).not.toContain('internal secret');
      } finally {
        mock.mockRestore();
      }
    },
  );
  it('refuses a library non-finite result without a fallback', () => {
    const ce = new ComputeEngine();
    const prototype = Object.getPrototypeOf(ce.number(1)) as {
      evaluate: () => unknown;
    };
    const mock = vi
      .spyOn(prototype, 'evaluate')
      .mockReturnValue(ce.PositiveInfinity);
    try {
      expect(math('a')).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'non-finite' }],
      });
    } finally {
      mock.mockRestore();
    }
  });
});
