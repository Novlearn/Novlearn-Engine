import { describe, expect, it, vi } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  parseMathInput,
  validateDefinition,
  validateSubmission,
} from 'novlearn-exercise-engine';
import type { MathInputResult } from 'novlearn-exercise-engine';
import fixture from './fixtures/contracts/rational-minimum.definition.json' with { type: 'json' };

const context = { parameters: ['a', 'b', 'c'], variables: ['x'] };
function success(source: string) {
  const result = parseMathInput(source, context);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) throw new Error('Expected parsing success');
  return result;
}
function failure(source: string, code: string) {
  const result: MathInputResult = parseMathInput(source, context);
  expect(result.source).toBe(source);
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
}
describe('scalar-latex-v1 mathematical boundary', () => {
  it.each([
    ['42', 42],
    ['1.25', 1.25],
    ['1{,}25', 1.25],
    ['\\frac{1}{2}', ['Divide', 1, 2]],
    [
      '\\frac{-b}{2a}',
      ['Divide', ['Negate', 'b'], ['InvisibleOperator', 2, 'a']],
    ],
    ['x^2', ['Power', 'x', 2]],
    ['\\sqrt{x}', ['Sqrt', 'x']],
    ['\\sqrt[3]{x}', ['Root', 'x', 3]],
    ['2x', ['InvisibleOperator', 2, 'x']],
    [
      'a x^2+b x+c',
      [
        'Add',
        ['InvisibleOperator', 'a', ['Power', 'x', 2]],
        ['InvisibleOperator', 'b', 'x'],
        'c',
      ],
    ],
    ['\\left(x+1\\right)', ['Delimiter', ['Add', 'x', 1]]],
    ['2\\cdot x', ['Multiply', 2, 'x']],
    ['  -2^2  ', ['Negate', ['Power', 2, 2]]],
    ['2^{-3}', ['Power', 2, ['Negate', 3]]],
    ['\\pi+\\exponentialE', ['Add', 'Pi', 'ExponentialE']],
  ])('preserves source and observed raw MathJSON for %s', (source, syntax) => {
    expect(success(source).syntax).toEqual(syntax);
    expect(success(source).source).toBe(source);
  });
  it.each([
    ['', 'empty'],
    ['1+', 'incomplete'],
    ['1{,}', 'incomplete'],
    ['1.', 'incomplete'],
    ['1% ignored', 'unsupported'],
    ['  \n ', 'empty'],
    ['\\frac{1}', 'incomplete'],
    ['\\frac{1}{}', 'incomplete'],
    ['\\frac{1}{', 'incomplete'],
    ['x^', 'incomplete'],
    ['\\placeholder{}', 'incomplete'],
    ['x+\\placeholder[value]{}', 'incomplete'],
    ['\\square', 'incomplete'],
    ['(x+1', 'invalid-syntax'],
    ['x+1)', 'invalid-syntax'],
    ['x}', 'invalid-syntax'],
    ['2^2^2', 'invalid-syntax'],
    ['y+x', 'unknown-symbol'],
    ['0y', 'unknown-symbol'],
    ['y-y', 'unknown-symbol'],
    ['\\wat{x}', 'unsupported'],
    ['1,25', 'unsupported'],
    ['(1,2)', 'unsupported'],
    ['1{,}2,3', 'unsupported'],
    ['\\sin x', 'unsupported'],
    ['x=1', 'unsupported'],
    ['\\text{abc}', 'unsupported'],
    ['\\infty', 'unsupported'],
    ['\\imaginaryI', 'unsupported'],
    ['i', 'unknown-symbol'],
    ['e', 'unknown-symbol'],
    ['NaN', 'unknown-symbol'],
    ['@a', 'invalid-syntax'],
    ['x'.repeat(4097), 'limit'],
    ['('.repeat(33) + '1' + ')'.repeat(33), 'limit'],
  ])('reports stable diagnostics for %s', (source, code) =>
    failure(source, code),
  );
  it('retains domain-sensitive and unevaluated expressions', () => {
    expect(success('x/x').syntax).toEqual(['Divide', 'x', 'x']);
    expect(success('1+2').syntax).toEqual(['Add', 1, 2]);
    expect(success('2/4').syntax).toEqual(['Divide', 2, 4]);
    expect(success('\\frac{1}{0}').syntax).toEqual(['Divide', 1, 0]);
    expect(success('\\sqrt{-1}').syntax).toEqual(['Sqrt', ['Negate', 1]]);
  });
  it('classifies symbols and isolates calls, contexts and returned data', () => {
    expect(success('b+a+x+\\pi').symbols).toEqual({
      parameters: ['a', 'b'],
      variables: ['x'],
      constants: ['Pi'],
    });
    expect(parseMathInput('a').ok).toBe(false);
    expect(parseMathInput('a', { parameters: ['a'] }).ok).toBe(true);
    expect(parseMathInput('a', { variables: ['a'] }).ok).toBe(true);
    expect(parseMathInput('a').ok).toBe(false);
    const first = success('x/x');
    if (Array.isArray(first.syntax)) first.syntax[1] = 0;
    expect(success('x/x').syntax).toEqual(['Divide', 'x', 'x']);
  });
  it.each([
    { parameters: ['a'], variables: ['a'] },
    { variables: ['e'] },
    { parameters: ['ab'] },
    { variables: ['Pi'] },
  ])('rejects invalid contexts %j', (ctx) => {
    expect(parseMathInput('1', ctx)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'invalid-context' }],
    });
  });
  it('bounds context and MathJSON complexity', () => {
    expect(
      parseMathInput('1', { variables: Array<string>(17).fill('x') }),
    ).toMatchObject({ ok: false, diagnostics: [{ code: 'limit' }] });
    failure(Array<string>(520).fill('x').join('+'), 'limit');
  });
  it('does not expose library exceptions', () => {
    const mock = vi
      .spyOn(ComputeEngine.prototype, 'parse')
      .mockImplementation(() => {
        throw new Error('internal details');
      });
    try {
      expect(parseMathInput('1')).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'invalid-syntax' }],
      });
    } finally {
      mock.mockRestore();
    }
  });
  it('uses Lot 2 source and names without changing transport validation', () => {
    const definition = validateDefinition(fixture);
    expect(definition.ok).toBe(true);
    if (!definition.ok) return;
    const d = definition.value;
    expect(
      parseMathInput(d.question.expectedLatex, {
        parameters: d.parameters.map((p) => p.name),
        variables: d.variables.map((v) => v.name),
      }).ok,
    ).toBe(true);
    const submission = validateSubmission({
      schemaVersion: 1,
      instanceId: 'i',
      questionId: 'q',
      answer: { format: 'latex', source: '\\placeholder{}' },
    });
    expect(submission.ok).toBe(true);
    if (submission.ok)
      expect(parseMathInput(submission.value.answer.source).ok).toBe(false);
  });
});
