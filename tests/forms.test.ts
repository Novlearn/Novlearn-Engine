import { describe, expect, it } from 'vitest';
import {
  gradeAnswer,
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';
import type {
  ExerciseDefinition,
  FormPolicy,
  NumericComparison,
} from 'novlearn-exercise-engine';

function definition(
  expected: string,
  form: FormPolicy,
  polynomial = false,
  comparison?: NumericComparison,
): ExerciseDefinition {
  return {
    schemaVersion: 5,
    kind: 'composed',
    id: 'forms',
    revision: '1',
    title: 'Forms',
    generation: {
      schemaVersion: 5,
      definitions: [],
      constraints: [],
      maxAttempts: 1,
      maxDraws: 1,
    },
    variables: polynomial ? [{ name: 'x', domain: 'real' }] : [],
    elements: [
      {
        id: 'q',
        type: 'question',
        text: 'Answer',
        points: 1,
        response: { format: 'latex', kind: polynomial ? 'expression' : 'real' },
        expectedLatex: expected,
        policy: {
          domain: polynomial ? 'polynomial' : 'real',
          form,
          ...(comparison ? { comparison } : {}),
        },
      },
    ],
  };
}
function official(
  expected: string,
  form: FormPolicy,
  polynomial = false,
  comparison?: NumericComparison,
) {
  const r = instantiateExercise(
    definition(expected, form, polynomial, comparison),
    { seed: 0, instanceId: 'official' },
  );
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.value;
}
function grade(
  expected: string,
  source: string,
  form: FormPolicy,
  polynomial = false,
  comparison?: NumericComparison,
) {
  return gradeAnswer(official(expected, form, polynomial, comparison), {
    schemaVersion: 5,
    instanceId: 'official',
    questionId: 'q',
    answer: { format: 'latex', source },
  });
}
describe('M5 independent value and original-syntax form witnesses', () => {
  it.each([
    ['2(x+1)', true],
    ['2*(x+1)', true],
    ['(2)((x+1))', true],
    ['2x+2', false],
    ['x+x+2', false],
    ['(x+1)*2', false],
  ])('explicit private form %s -> %s', (source, conforms) => {
    expect(
      grade(
        '2x+2',
        source,
        { kind: 'accepted-latex', latex: ['2(x+1)'] },
        true,
      ),
    ).toMatchObject({
      value: 'equal',
      state: conforms ? 'correct' : 'incorrect',
      form: conforms ? 'conforming' : 'nonconforming',
    });
  });
  it('authorizes several explicit structures and preserves decimal notation', () => {
    expect(
      grade('1/2', '0.5', { kind: 'accepted-latex', latex: ['1/2', '0.5'] })
        .state,
    ).toBe('correct');
    expect(
      grade('1/2', '2/4', { kind: 'accepted-latex', latex: ['1/2', '0.5'] }),
    ).toMatchObject({ value: 'equal', form: 'nonconforming' });
    expect(
      grade('1/2', '1.0/2.0', { kind: 'accepted-latex', latex: ['1/2'] }).form,
    ).toBe('nonconforming');
  });
  it.each(['2x+3', 'x/x', '\\sqrt{x^2}', 'y', ''])(
    'fails instantiation for unproved official alternative %s',
    (source) => {
      const result = instantiateExercise(
        definition('2x+2', { kind: 'accepted-latex', latex: [source] }, true),
        { seed: 0, instanceId: 'official' },
      );
      expect(result.ok).toBe(false);
    },
  );
  it('substitutes official parameters through Cortex while preserving the template structure', () => {
    const d = definition(
      'a*x+a',
      { kind: 'accepted-latex', latex: ['a(x+1)'] },
      true,
    );
    d.generation.definitions = [
      { name: 'a', kind: 'integer', min: 2, max: 2, exclusions: [] },
    ];
    const instance = instantiateExercise(d, {
      seed: 0,
      instanceId: 'official',
    });
    if (!instance.ok) throw new Error(JSON.stringify(instance.diagnostics));
    const submission = {
      schemaVersion: 5,
      instanceId: 'official',
      questionId: 'q',
      answer: { format: 'latex', source: '2(x+1)' },
    };
    expect(gradeAnswer(instance.value, submission)).toMatchObject({
      state: 'correct',
      form: 'conforming',
    });
    expect(JSON.stringify(projectPublicInstance(instance.value))).not.toContain(
      'accepted-latex',
    );
    const q = instance.value.elements.find((e) => e.type === 'question');
    if (!q || q.type !== 'question') throw new Error('missing question');
    q.policy.form = { kind: 'accepted-latex', latex: ['a(x+2)'] };
    expect(gradeAnswer(instance.value, submission).state).toBe('error');
  });
  it.each([
    ['1/2', '1/2', true],
    ['1/2', '2/4', false],
    ['-1/2', '-1/2', true],
    ['-1/2', '1/(-2)', true],
    ['-1/2', '-2/4', false],
    ['1/2', '-(-1/2)', true],
    ['0', '0/1', true],
    ['0', '0/2', false],
    ['3', '3', true],
    ['3', '3/1', true],
    ['1/2', '0.5', false],
    ['1/2', '0{,}5', false],
    ['1/2', '1.0/2.0', undefined],
    ['1/2', '(1)/(2)', true],
    ['1/2', '\\frac{1}{2}', true],
    ['1/2', '(1+1)/4', undefined],
    ['1/2', '2^1/4', undefined],
    ['1/2', '1/4+1/4', false],
  ])('fraction %s / %s -> %s', (expected, source, conforms) => {
    const r = grade(expected, source, 'irreducible-fraction');
    expect(r.value).toBe('equal');
    expect(r.form).toBe(
      conforms === true
        ? 'conforming'
        : conforms === false
          ? 'nonconforming'
          : 'unknown',
    );
    expect(r.state).toBe(
      conforms === true
        ? 'correct'
        : conforms === false
          ? 'incorrect'
          : 'indeterminate',
    );
    expect(r.proof).not.toBe('none');
  });
  it.each([
    ['2x+2', true],
    ['2(x+1)', false],
    ['x+x+2', true],
    ['(x+1)+(x+1)', true],
    ['(1+1)x+2', true],
    ['-(2x+2)', false],
    ['(x+1)^2', false],
    ['x*x+2*x+1', true],
    ['(x+1)(x-1)', false],
    ['(x+1)/2', false],
    ['x-(x^2+1)', false],
    ['1-(x^2+x)', false],
    ['0-(2x+2)', false],
  ])('expanded shape %s -> %s', (source, conforms) => {
    const r = grade(source, source, 'expanded', true);
    expect(r.value).toBe('equal');
    expect(r.form).toBe(conforms ? 'conforming' : 'nonconforming');
    expect(r.state).toBe(conforms ? 'correct' : 'incorrect');
  });
  it.each([
    ['2x+2', true],
    ['x+x+2', false],
    ['x^2+2x+1', true],
    ['x*x+2x+1', false],
    ['(2+1)x+1', false],
    ['(2/4)x+1', false],
    ['(1/2)x+1', true],
    ['x/2+1', true],
    ['2x/4+1', false],
    ['2x/3+1', true],
    ['1x+2', false],
    ['0x+2', false],
    ['x^1+2', false],
    ['x+0', false],
    ['0', true],
    ['0/1', false],
    ['0.5x+1', true],
    ['x^2+x^2+1', false],
    ['x+2+x^2', true],
    ['(x)+2', true],
    ['-(-x)+2', false],
    ['-x+2', true],
    ['x-(x^2+1)', false],
    ['1-(x^2+x)', false],
    ['x-(-1)', false],
    ['x-(-1/2)', false],
    ['x-(-(1/2))', false],
    ['x-(-2x/3)', false],
    ['x-((-1)/2)', false],
    ['x-1/(-2)', false],
    ['-(-2x/3)', false],
    ['-(-1/2)x+1', false],
    ['((-1)/(-2))x+1', false],
    ['(-2)(-x)+1', false],
    ['(2/1)x+1', false],
    ['2/1', false],
    ['0.0', true],
    ['0{,}0', true],
    ['-0', true],
    ['-0.0', true],
    ['-0{,}0', true],
    ['-(-0)', false],
    ['-(-0.0)', false],
  ])('reduced shape %s -> %s', (source, conforms) => {
    const r = grade(source, source, 'reduced', true);
    expect(r.value).toBe('equal');
    expect(r.form).toBe(conforms ? 'conforming' : 'nonconforming');
  });
  it('value-only still accepts unreduced fractions', () => {
    expect(grade('1/2', '2/4', 'value-only')).toMatchObject({
      state: 'correct',
      value: 'equal',
      form: 'not-required',
    });
  });
  it.each([
    ['(x-1)(x+1)', true],
    ['x^2-1', false],
    ['2((x^2-1)/2)', false],
    ['x^2+1', true],
    ['x^2-2', true],
    ['x^2-4', false],
    ['x^2+2x+1', false],
    ['(x+1)^2', true],
    ['x^2', true],
    ['x', true],
    ['2x+4', true],
    ['0', true],
    ['(x^2+1)(x-1)', true],
    ['(x^2-1)(x-1)', false],
    ['(x^2-2)^2', true],
    ['x^4+4', undefined],
    ['x^3+1', undefined],
    ['(x^4+4)(x-1)', undefined],
    ['(x^4+4)(x^2-1)', false],
    ['0*(x^2-1)', false],
    ['0*x', false],
    ['(x-x)*(x+1)', false],
    ['x-x', false],
  ])('complete rational factorization %s -> %s', (source, conforms) => {
    const r = grade(source, source, 'factorized', true);
    expect(r.value).toBe('equal');
    expect(r.form).toBe(
      conforms === true
        ? 'conforming'
        : conforms === false
          ? 'nonconforming'
          : 'unknown',
    );
    expect(r.state).toBe(
      conforms === true
        ? 'correct'
        : conforms === false
          ? 'incorrect'
          : 'indeterminate',
    );
  });
  it.each(['((1+1)/3)x+1', '(1.0/2.0)x+1'])(
    'preserves an unknown coefficient form in %s',
    (source) => {
      expect(grade(source, source, 'reduced', true)).toMatchObject({
        state: 'indeterminate',
        value: 'equal',
        form: 'unknown',
      });
    },
  );
  it('agrees with an independent integer gcd oracle on bounded fraction pairs', () => {
    const gcd = (a: number, b: number): number =>
      b === 0 ? Math.abs(a) : gcd(b, a % b);
    const instance = official('1/2', 'irreducible-fraction');
    for (let n = 1; n <= 12; n++) {
      const r = gradeAnswer(instance, {
        schemaVersion: 5,
        instanceId: 'official',
        questionId: 'q',
        answer: { format: 'latex', source: `${n}/${2 * n}` },
      });
      expect(r.value).toBe('equal');
      expect(r.form).toBe(gcd(n, 2 * n) === 1 ? 'conforming' : 'nonconforming');
    }
  });
  it.each([
    [0, -1],
    [0, -2],
    [0, 1],
    [2, 1],
    [3, 1],
    [4, 3],
    [-2, -1],
    [-3, 2],
  ])(
    'agrees with the independent quadratic discriminant oracle for b=%s c=%s',
    (b, c) => {
      const d = b * b - 4 * c;
      const irreducible = d < 0 || !Number.isInteger(Math.sqrt(d));
      const source = `x^2+(${b})x+(${c})`;
      expect(grade(source, source, 'factorized', true).form).toBe(
        irreducible ? 'conforming' : 'nonconforming',
      );
    },
  );
  it('accepts either expanded or completely factorized shapes, preserving unknowns', () => {
    expect(
      grade(
        'x^2-1',
        '(x-1)(x+1)',
        { kind: 'accepted-forms', anyOf: ['expanded', 'factorized'] },
        true,
      ),
    ).toMatchObject({ state: 'correct', form: 'conforming' });
    expect(
      grade(
        'x^3+1',
        '(x^3+1)',
        { kind: 'accepted-forms', anyOf: ['reduced', 'factorized'] },
        true,
      ),
    ).toMatchObject({ state: 'correct', form: 'conforming' });
  });
  it('a wrong value is independently wrong despite conforming form', () => {
    expect(grade('1/2', '1/3', 'irreducible-fraction')).toMatchObject({
      state: 'incorrect',
      value: 'different',
      form: 'conforming',
    });
  });
  it('an unknown form does not override a proved wrong value', () => {
    expect(grade('1/2', '(1+1)/3', 'irreducible-fraction')).toMatchObject({
      state: 'incorrect',
      value: 'different',
      form: 'unknown',
    });
  });
  it('multiple authorized families use an explicit inclusive choice', () => {
    expect(
      grade(
        '2x+2',
        'x+x+2',
        { kind: 'accepted-forms', anyOf: ['expanded', 'reduced'] },
        true,
      ),
    ).toMatchObject({ state: 'correct', form: 'conforming' });
  });
  it('preserves raw syntax and excludes all policy data from public projection', () => {
    const instance = official('1/2', 'irreducible-fraction');
    const before = JSON.stringify(instance);
    gradeAnswer(instance, {
      schemaVersion: 5,
      instanceId: 'official',
      questionId: 'q',
      answer: { format: 'latex', source: '1.0/2.0' },
    });
    expect(JSON.stringify(instance)).toBe(before);
    expect(JSON.stringify(projectPublicInstance(instance))).not.toContain(
      'irreducible-fraction',
    );
  });
  it('exact and approximate decisions retain their proof separately from form', () => {
    const comparison: NumericComparison = {
      mode: 'approximate',
      absolute: '0.01',
      relative: '0',
    };
    expect(
      grade('1/3', '33/100', 'irreducible-fraction', false, comparison),
    ).toMatchObject({
      state: 'correct',
      value: 'within-tolerance',
      form: 'conforming',
    });
    expect(
      grade('1/3', '66/200', 'irreducible-fraction', false, comparison),
    ).toMatchObject({
      state: 'incorrect',
      value: 'within-tolerance',
      form: 'nonconforming',
    });
    expect(grade('1/3', '33/100', 'irreducible-fraction')).toMatchObject({
      state: 'incorrect',
      value: 'different',
      form: 'conforming',
    });
  });
  it.each(['expanded', 'reduced', 'factorized'] as const)(
    'rejects polynomial form %s on numeric profiles',
    (form) => {
      expect(validateDefinition(definition('1', form)).ok).toBe(false);
    },
  );
  it.each([
    { kind: 'accepted-forms', anyOf: [] },
    { kind: 'accepted-forms', anyOf: ['expanded', 'expanded'] },
    { kind: 'accepted-forms', anyOf: ['expanded', 'invalid'] },
    { kind: 'accepted-forms', anyOf: ['expanded'], allowAll: true },
  ])('rejects malformed official form policy %j', (form) => {
    const d = definition('x', 'value-only', true);
    const raw = JSON.parse(JSON.stringify(d));
    raw.elements[0].policy.form = form;
    expect(validateDefinition(raw).ok).toBe(false);
  });
  it.each(['1/0', '\\frac{1}{}', ''])(
    'domain/invalid syntax precedes form checking %s',
    (source) => {
      expect(grade('1/2', source, 'irreducible-fraction').state).toBe(
        'invalid',
      );
    },
  );
});
