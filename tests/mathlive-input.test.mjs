import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  gradeAnswer,
  instantiateExercise,
  parseMathInput,
  validateSubmission,
} from 'novlearn-exercise-engine';

// Observed in a real local browser. These tests replay the captured strings;
// running Vitest does not launch MathLive or claim a new browser session.
const observed = JSON.parse(
  readFileSync(
    new URL('./fixtures/mathlive/observed-0.111.1.json', import.meta.url),
    'utf8',
  ),
);
const cases = JSON.parse(
  readFileSync(
    new URL('../tools/mathlive/cases.json', import.meta.url),
    'utf8',
  ),
);
const manual = [
  { id: 'keyboard-fr', kind: 'rational', expected: '5/4' },
  { id: 'keyboard-fraction', kind: 'rational', expected: '1/2' },
  { id: 'paste-fraction', kind: 'rational', expected: '1/2' },
  { id: 'paste-wrapped', kind: 'real', expected: '\\sqrt{2}' },
  { id: 'keyboard-set-semicolon', kind: 'set', expected: '\\{1,2\\}' },
  { id: 'keyboard-set-comma', kind: 'set', expected: '\\{6/5\\}' },
  { id: 'keyboard-interval', kind: 'intervals', expected: '[1;2]' },
  { id: 'virtual-fr', kind: 'rational', expected: '15/2' },
].map((item) => ({ ...item, state: 'correct' }));
const expectations = [...cases, ...manual];
function official(config) {
  const definition = {
    schemaVersion: 5,
    kind: 'composed',
    id: 'm7',
    revision: '1',
    title: 'M7',
    generation: {
      schemaVersion: 5,
      definitions: [],
      constraints: [],
      maxAttempts: 1,
      maxDraws: 1,
    },
    variables:
      config.kind === 'expression' ? [{ name: 'x', domain: 'real' }] : [],
    elements: [
      {
        id: 'q',
        type: 'question',
        text: 'Calculer.',
        points: 1,
        response: {
          format: 'latex',
          kind: config.kind,
          ...(config.kind === 'expression' ? { variable: 'x' } : {}),
        },
        expectedLatex: config.expected,
        policy: {
          domain: config.kind === 'expression' ? 'polynomial' : config.kind,
          form: 'value-only',
        },
      },
    ],
  };
  const result = instantiateExercise(definition, { seed: 0, instanceId: 'm7' });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.value;
}
function submission(source) {
  return {
    schemaVersion: 5,
    instanceId: 'm7',
    questionId: 'q',
    answer: { format: 'latex', source },
  };
}
const variants = observed.records.flatMap((row) =>
  ['latex', 'expandedLatex'].map((variant) => ({
    id: row.id,
    variant,
    source: row[variant],
  })),
);

describe('M7 observed MathLive 0.111.1 strings through the public package', () => {
  it.each(variants)(
    '$id ($variant): official correction preserves the submission source',
    ({ id, source }) => {
      const config = expectations.find((item) => item.id === id);
      if (!config) throw new Error(`Missing trusted case ${id}`);
      const input = submission(source);
      const before = JSON.stringify(input);
      const validation = validateSubmission(input);
      expect(validation.ok).toBe(true);
      if (!validation.ok) throw new Error('Invalid envelope');
      expect(validation.value.answer.source).toBe(source);
      expect(gradeAnswer(official(config), input)).toMatchObject({
        state: config.state,
      });
      expect(JSON.stringify(input)).toBe(before);
    },
  );
  it('anchors the browser capture to the isolated pinned dependency and exact case inventory', () => {
    const lock = JSON.parse(
      readFileSync(
        new URL('../tools/mathlive/package-lock.json', import.meta.url),
        'utf8',
      ),
    );
    expect(lock.packages['node_modules/mathlive'].version).toBe('0.111.1');
    expect(observed).toMatchObject({
      schemaVersion: 1,
      mathliveVersion: '0.111.1',
      locale: 'fr',
      decimalSeparator: ',',
    });
    expect(observed.capturedAt).toMatch(/^2026-10-11T/);
    expect(observed.browser).toContain('Windows');
    expect(observed.records.map((row) => row.id).sort()).toEqual(
      expectations.map((row) => row.id).sort(),
    );
  });
  it('distinguishes API insertion from actual keyboard, clipboard and virtual keyboard events', () => {
    const byId = (id) => observed.records.find((row) => row.id === id);
    expect(byId('fraction')).toMatchObject({
      operation: 'set-value',
      events: [],
    });
    expect(byId('keyboard-fr')).toMatchObject({
      operation: 'keyboard',
      latex: '1{,}25',
      events: expect.arrayContaining([
        expect.objectContaining({ type: 'keydown', key: ',' }),
      ]),
    });
    expect(byId('paste-fraction')).toMatchObject({
      operation: 'paste',
      events: expect.arrayContaining([{ type: 'paste', text: '\\frac{3}{6}' }]),
    });
    expect(byId('paste-wrapped')).toMatchObject({
      operation: 'paste',
      events: expect.arrayContaining([
        { type: 'paste', text: '$$\\sqrt{8}/2$$' },
      ]),
    });
    expect(byId('virtual-fr')).toMatchObject({
      operation: 'virtual-keyboard',
      latex: '7{,}5',
      events: expect.arrayContaining([
        expect.objectContaining({ type: 'input' }),
      ]),
    });
  });
  it('keeps decimal comma distinct from a set separator', () => {
    const two = observed.records.find(
      (row) => row.id === 'keyboard-set-semicolon',
    );
    const decimal = observed.records.find(
      (row) => row.id === 'keyboard-set-comma',
    );
    expect(two.expandedLatex).toBe('\\left\\lbrace1;2\\right\\rbrace');
    expect(decimal.expandedLatex).toBe('\\left\\lbrace1{,}2\\right\\rbrace');
    expect(
      gradeAnswer(
        official({ kind: 'set', expected: '\\{1,2\\}' }),
        submission(decimal.expandedLatex),
      ),
    ).toMatchObject({ state: 'incorrect', value: 'different' });
  });
  it('keeps placeholders present in the expanded source, independently of prompt IDs', () => {
    const row = observed.records.find((item) => item.id === 'placeholder');
    expect(row.expandedLatex).toContain('\\placeholder{}');
    expect(row.prompts).toEqual([]);
    expect(
      gradeAnswer(
        official({ kind: 'rational', expected: '0' }),
        submission(row.expandedLatex),
      ),
    ).toMatchObject({ state: 'invalid', code: 'incomplete' });
  });
});

describe('M7 empty scripts and Cortex delimiter dictionary regressions', () => {
  it.each([
    '2^{}',
    '2^{ }',
    '2^{{}}',
    '2^{ { } { } }',
    '2^{{{}}}',
    '2_{}',
    '2^{\\ }',
    '2^{\\ {}}',
    '2_{\\ }',
    '2^{\\ \\ }',
    '2^{\\\n}',
  ])('does not accept %s as the complete number 2', (source) => {
    expect(parseMathInput(source)).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'incomplete',
          message: expect.any(String),
          offset: expect.any(Number),
        },
      ],
    });
    expect(
      gradeAnswer(
        official({ kind: 'rational', expected: '2' }),
        submission(source),
      ),
    ).toMatchObject({ state: 'invalid', code: 'incomplete' });
  });
  it.each(['2^{ {} 1}', '2^{\\ 1}', '2^{ {}\\ 1}'])(
    'does not confuse harmless spacing/grouping with an empty exponent: %s',
    (source) => {
      expect(
        gradeAnswer(
          official({ kind: 'rational', expected: '2' }),
          submission(source),
        ),
      ).toMatchObject({ state: 'correct' });
    },
  );
  const brackets = [
    ['[', ']', '\\lbrack', '\\rbrack'],
    ['[', '[', '\\lbrack', '\\lbrack'],
    [']', ']', '\\rbrack', '\\rbrack'],
    [']', '[', '\\rbrack', '\\lbrack'],
  ];
  const aliases = brackets.flatMap(([open, close, opening, closing]) =>
    [open, opening].flatMap((left) =>
      [close, closing].map((right) => ({
        source: `\\left${left}1;2\\right${right}`,
        expected: `${open}1;2${close}`,
      })),
    ),
  );
  it.each(aliases)(
    'proves the closure of mixed aliases: $source',
    ({ source, expected }) => {
      expect(
        gradeAnswer(
          official({ kind: 'intervals', expected }),
          submission(source),
        ),
      ).toMatchObject({ state: 'correct' });
    },
  );
  it('does not lose an open endpoint in bracket aliases', () => {
    expect(
      gradeAnswer(
        official({ kind: 'intervals', expected: '[1;2]' }),
        submission('\\left\\lbrack1;2\\right\\lbrack'),
      ),
    ).toMatchObject({ state: 'incorrect' });
  });
});
