import { expect, it } from 'vitest';
import { formatTextMath } from '../src/math/text-display.js';
import {
  instantiateExercise,
  projectPublicInstance,
  gradeAnswer,
} from '../src/index.js';
import type { ExerciseDefinition } from '../src/index.js';

it('keeps literal text-answer variants outside display formatting', () => {
  const definition: ExerciseDefinition = {
    schemaVersion: 5,
    kind: 'composed',
    id: 'text-answer',
    revision: '1',
    title: 'Texte',
    generation: {
      schemaVersion: 5,
      definitions: [
        { name: 'r', kind: 'integer', min: -7, max: -7, exclusions: [] },
      ],
      constraints: [],
      maxAttempts: 1,
      maxDraws: 1,
    },
    variables: [],
    elements: [
      {
        id: 'q',
        type: 'question',
        text: 'Recopier $x+@r$',
        points: 1,
        response: { format: 'text', kind: 'text' },
        expectedTexts: ['$x+@r$'],
        policy: {
          domain: 'text',
          form: 'value-only',
          normalization: { trim: true },
        },
      },
    ],
  };
  const result = instantiateExercise(definition, {
    seed: 42,
    instanceId: 'text',
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.elements[0]).toMatchObject({
    text: 'Recopier $x-7$',
    expected: { variants: ['$x+-7$'] },
  });
  expect(
    gradeAnswer(result.value, {
      schemaVersion: 5,
      instanceId: 'text',
      questionId: 'q',
      answer: { format: 'text', source: '$x+-7$' },
    }).state,
  ).toBe('correct');
});
function render(
  source: string,
  parameters: Record<string, number | string> = { r: -7, u0: 1 },
) {
  return formatTextMath(source, parameters, (part) =>
    part.replace(/@@|@([A-Za-z0-9_]+)/g, (_, name: string) =>
      name === undefined ? '@' : String(parameters[name]),
    ),
  );
}
it('renders arithmetic sequence statements and explanations with the same signed parameter AST', () => {
  expect(render('On pose $u_0=@u0$ et $u_{n+1}=u_n+@r$.')).toBe(
    'On pose $u_0=1$ et $u_{n+1}=u_{n}-7$.',
  );
  expect(render(String.raw`$\forall n\in\mathbb{N},u_n=@u0+@r n$`)).toBe(
    String.raw`$\forall n\in\mathbb{N}, u_{n}=1-7n$`,
  );
});
it.each([-7, 0, 1, 7])(
  'keeps integer parameter %s correctly grouped in powers',
  (r) => {
    const text = render('$x+@r^2$', { r });
    expect(text).toContain(r < 0 ? '(-7)^2' : String(r) + '^2');
    expect(text).not.toContain('49');
  },
);
it('preserves subtraction parentheses, exact fractions, decimal signs and uninterpreted domains', () => {
  expect(render('$x-@r$')).toBe('$x-(-7)$');
  expect(render('$x+@r$', { r: '-1/2' })).toBe(String.raw`$x-\frac{1}{2}$`);
  expect(render('$x+@r$', { r: -0.3 })).toBe('$x-0{,}3$');
  expect(render(String.raw`$\sqrt{@r}$`)).toBe(String.raw`$\sqrt{-7}$`);
});
it('binds whole parameter atoms in unbraced exponents and subscripts', () => {
  expect(render('$f(x)=(@a x+@b)^@n$', { a: 2, b: -2, n: 3 })).toBe(
    '$f(x)=(2x-2)^3$',
  );
  expect(render('$u_@n+@r^@n$', { r: -7, n: 2 })).toBe('$u_{2}+(-7)^2$');
  expect(
    render(String.raw`$f(x)=\frac{sin(x)x+x^2}{(x+@r)^2}\newline$`),
  ).not.toContain('+-');
});
it('keeps authored elementary functions and square grouping in derivative explanations', () => {
  expect(render(String.raw`$\Leftrightarrow 2x+@r=0$`)).toBe(
    String.raw`$\Leftrightarrow 2x-7=0$`,
  );
  const result = render(
    String.raw`$f'(x)=@a ln(x)^2+[2\times@a+@b]ln(x)+@c+@b$`,
    { a: 7, b: 8, c: -1 },
  );
  expect(result).toContain(String.raw`\ln`);
  expect(result).not.toContain('+-');
  expect(result).not.toContain('+ -');
  expect(result).not.toContain('ln\\times');
  expect(render('$x ln(@r)$')).toBe(String.raw`$x\ln(-7)$`);
});
it('keeps prose, escaped references, authored math and unsupported notation literal', () => {
  expect(render('La raison vaut @r.')).toBe('La raison vaut -7.');
  expect(render('$x+-7$')).toBe('$x+-7$');
  expect(render('$@@r$')).toBe('$@r$');
  expect(render(String.raw`\$@r et $$u_n+@r$$`)).toBe(
    String.raw`\$-7 et $$u_{n}-7$$`,
  );
  expect(render(String.raw`$\text{@r}$`)).toBe(String.raw`$\text{-7}$`);
  expect(render('$x+@r')).toBe('$x+-7');
});
it('normalizes display while leaving exact grading and private source intact', () => {
  const definition: ExerciseDefinition = {
    schemaVersion: 5,
    kind: 'composed',
    id: 'text-display',
    revision: '1',
    title: 'Suite',
    generation: {
      schemaVersion: 5,
      definitions: [
        { name: 'r', kind: 'integer', min: -7, max: -7, exclusions: [] },
      ],
      constraints: [],
      maxAttempts: 1,
      maxDraws: 1,
    },
    variables: [],
    elements: [
      { id: 't', type: 'text', text: '$u_{n+1}=u_n+@r$' },
      {
        id: 'q',
        type: 'question',
        text: 'Calculer $u_{14}$',
        points: 1,
        response: { format: 'latex', kind: 'rational' },
        expectedLatex: '1+14\\mathrm{r}',
        policy: { domain: 'rational', form: 'value-only' },
      },
      {
        id: 'e',
        type: 'explanation',
        questionId: 'q',
        content: [{ type: 'text', text: '$u_n=1+@r n$' }],
      },
    ],
  };
  const original = structuredClone(definition),
    result = instantiateExercise(definition, { seed: 42, instanceId: 'i' });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) return;
  expect(projectPublicInstance(result.value).elements[0]).toMatchObject({
    text: '$u_{n+1}=u_{n}-7$',
  });
  expect(result.value.elements.find((e) => e.id === 'e')).toMatchObject({
    content: [{ text: '$u_{n}=1-7n$' }],
  });
  expect(
    gradeAnswer(result.value, {
      schemaVersion: 5,
      instanceId: 'i',
      questionId: 'q',
      answer: { format: 'latex', source: '1-14*7' },
    }).state,
  ).toBe('correct');
  expect(
    gradeAnswer(result.value, {
      schemaVersion: 5,
      instanceId: 'i',
      questionId: 'q',
      answer: { format: 'latex', source: '-98' },
    }).state,
  ).toBe('incorrect');
  expect(definition).toEqual(original);
});
