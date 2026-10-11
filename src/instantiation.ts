import type {
  ContractDiagnostic,
  ExerciseDefinition,
  ExerciseInstance,
  PublicInstance,
  PrivateElement,
  PublicElement,
  GeneratedValue,
} from './contracts/types.js';
import { validate, validateDefinition } from './contracts/validation.js';
import { generateVariables } from './generation/variables.js';
import type {
  GenerateVariablesOptions,
  GenerationDiagnostic,
  GenerateVariablesResult,
} from './generation/variables.js';
import { instantiateMath } from './math/substitution.js';
import type { InstantiationMathDiagnostic } from './math/substitution.js';
import { MathFailure } from './math/substitution.js';
import { prepareNumeric } from './math/numeric.js';
import { instantiateDisplayMath } from './math/display.js';
import { checkDisplayData } from './math/display-data-checks.js';
import { mapDisplayData } from './display-elements.js';
import { displayFields } from './contracts/display-validation.js';
import type {
  DisplayElement,
  PrivateDisplayElement,
} from './contracts/elements.js';
import type { ExerciseElement } from './contracts/types.js';

function isDisplayElement(element: ExerciseElement): element is DisplayElement {
  return Object.hasOwn(displayFields, element.type);
}
function isPrivateDisplayElement(
  element: PrivateElement,
): element is PrivateDisplayElement {
  return Object.hasOwn(displayFields, element.type);
}
class ElementFailure extends Error {
  constructor(readonly diagnostics: InstantiationDiagnostic[]) {
    super('Display element could not be instantiated.');
  }
}
export interface InstantiateExerciseOptions extends GenerateVariablesOptions {
  instanceId: string;
}
export type InstantiationDiagnostic = (
  ContractDiagnostic | GenerationDiagnostic | InstantiationMathDiagnostic
) & {
  stage:
    | 'definition'
    | 'options'
    | 'generation'
    | 'text'
    | 'statement'
    | 'expected'
    | 'option'
    | 'instance';
  elementId?: string;
  questionId?: string;
};
export type InstantiateExerciseResult =
  | { ok: true; value: ExerciseInstance }
  | { ok: false; diagnostics: InstantiationDiagnostic[] };
/** A bounded text template, never interpreted as algebra or inline LaTeX. */
function textTemplate(
  source: string,
  parameters: Readonly<Record<string, number | string>>,
  path: string,
):
  | { ok: true; value: string }
  | { ok: false; diagnostics: InstantiationDiagnostic[] } {
  let value = '';
  for (let index = 0; index < source.length;) {
    if (source[index] !== '@') {
      value += source[index]!;
      index += 1;
      continue;
    }
    if (source[index + 1] === '@') {
      value += '@';
      index += 2;
      continue;
    }
    let end = index + 1;
    while (end < source.length && /[a-zA-Z0-9_]/.test(source[end]!)) end += 1;
    const name = source.slice(index + 1, end);
    if (!name) {
      value += '@';
      index += 1;
      continue;
    }
    if (!Object.hasOwn(parameters, name))
      return {
        ok: false,
        diagnostics: [
          {
            stage: 'text',
            code: 'missing-variable',
            path,
            message: `Unknown text parameter @${name}.`,
            symbol: name,
          },
        ],
      };
    value += String(parameters[name]);
    index = end;
  }
  if (value.length > 4096)
    return {
      ok: false,
      diagnostics: [
        {
          stage: 'text',
          code: 'limit',
          path,
          message: 'Instantiated text exceeds 4096 characters.',
        },
      ],
    };
  return { ok: true, value };
}

/** One canonical context, one ordered element pass, one detached snapshot. */
export function instantiateExercise(
  definition: unknown,
  options: InstantiateExerciseOptions,
): InstantiateExerciseResult {
  const checked = validateDefinition(definition);
  if (!checked.ok)
    return {
      ok: false,
      diagnostics: checked.diagnostics.map((d) => ({
        ...d,
        stage: 'definition',
      })),
    };
  const checkedOptions = validate<InstantiateExerciseOptions>(
    options,
    (v, data) => {
      const o = v.object(data, '', ['instanceId', 'seed', 'generationVersion']);
      v.text(o.instanceId, '/instanceId', 128);
    },
  );
  if (!checkedOptions.ok)
    return {
      ok: false,
      diagnostics: checkedOptions.diagnostics.map((d) => ({
        ...d,
        stage: 'options',
      })),
    };
  const o = checkedOptions.value;
  const generated = generateVariables(checked.value.generation, {
    seed: o.seed,
    ...(o.generationVersion === undefined
      ? {}
      : { generationVersion: o.generationVersion }),
  });
  if (!generated.ok)
    return {
      ok: false,
      diagnostics: generated.diagnostics.map((d) => ({
        ...d,
        path: '/generation' + d.path,
        stage: 'generation',
      })),
    };
  return instantiateElements(checked.value, generated, o);
}
/** Select fields explicitly from an official, trusted server snapshot. */
export function projectPublicInstance(
  instance: ExerciseInstance,
): PublicInstance {
  return {
    schemaVersion: 5,
    instanceId: instance.instanceId,
    title: instance.title,
    elements: instance.elements
      .map(projectElement)
      .filter((e): e is PublicElement => e !== undefined),
  };
}
/** Exact decimal spelling for prose; no rounded quotient enters templates. */
function textValue(value: GeneratedValue): string {
  if (value.kind === 'rational')
    return value.denominator === 1
      ? String(value.numerator)
      : `${value.numerator}/${value.denominator}`;
  if (value.kind !== 'decimal') return String(value.value);
  const digits = String(Math.abs(value.coefficient)).padStart(
    value.precision + 1,
    '0',
  );
  const sign = value.coefficient < 0 ? '-' : '';
  return value.precision === 0
    ? sign + digits
    : `${sign}${digits.slice(0, -value.precision)}.${digits.slice(-value.precision)}`;
}

function instantiateElements(
  definition: ExerciseDefinition,
  generated: Extract<GenerateVariablesResult, { ok: true }>,
  options: InstantiateExerciseOptions,
): InstantiateExerciseResult {
  const parameters = Object.fromEntries(
    Object.entries(generated.values).map(([name, value]) => [
      name,
      textValue(value),
    ]),
  );
  const title = textTemplate(definition.title, parameters, '/title');
  if (!title.ok) return title;
  const context = {
    parameters: Object.keys(generated.values),
    variables: definition.variables.map((v) => v.name),
  };
  const elements: PrivateElement[] = [];
  for (const [index, element] of definition.elements.entries()) {
    const path = `/elements/${index}`;
    const identity = {
      id: element.id,
      ...((element.type === 'question' || element.type === 'mcq') &&
      element.keyboard !== undefined
        ? { keyboard: element.keyboard }
        : {}),
      ...(element.sectionId === undefined
        ? {}
        : { sectionId: element.sectionId }),
    };
    const failElement = (
      diagnostics: InstantiationDiagnostic[],
    ): InstantiateExerciseResult => ({
      ok: false,
      diagnostics: diagnostics.map((d) => ({
        ...d,
        elementId: element.id,
        ...(element.type === 'question' || element.type === 'mcq'
          ? { questionId: element.id }
          : {}),
      })),
    });
    if (isDisplayElement(element)) {
      const mathFields: PrivateDisplayElement['mathFields'] = [];
      const formulaContext =
        element.type === 'function-graph'
          ? { ...context, variables: [element.variable] }
          : element.type === 'sequence-graph' &&
              element.sequence.mode !== 'points'
            ? {
                ...context,
                variables:
                  element.sequence.mode === 'explicit'
                    ? [element.sequence.indexVariable]
                    : [
                        element.sequence.indexVariable,
                        element.sequence.termVariable,
                      ],
              }
            : context;
      try {
        const data = mapDisplayData(
          element,
          {
            number(value, fieldPath) {
              const result = instantiateMath(
                value.latex,
                context,
                generated.values,
                `${fieldPath}/latex`,
                true,
              );
              if (!result.ok)
                throw new ElementFailure(
                  result.diagnostics.map((d) => ({ ...d, stage: 'statement' })),
                );
              if (!result.exact)
                throw new MathFailure({
                  code: 'not-calculable',
                  path: fieldPath,
                  message: 'Exact numeric render data required.',
                });
              mathFields.push({
                path: `${fieldPath}/latex`,
                math: result.value,
                admission: 'exact-rational',
              });
              return {
                numerator: result.exact.numerator,
                denominator: result.exact.denominator,
                latex: result.value.displayLatex,
              };
            },
            text(source, fieldPath) {
              const result = textTemplate(source, parameters, fieldPath);
              if (!result.ok) throw new ElementFailure(result.diagnostics);
              return result.value;
            },
            formula(source, fieldPath, relation) {
              const result = instantiateDisplayMath(
                source,
                formulaContext,
                generated.values,
                fieldPath,
                relation,
              );
              if (!result.ok)
                throw new ElementFailure(
                  result.diagnostics.map((d) => ({ ...d, stage: 'statement' })),
                );
              mathFields.push({
                path: fieldPath,
                math: result.value,
                admission: 'display-only',
              });
              return result.value.displayLatex;
            },
          },
          path,
        );
        checkDisplayData(data, path);
        elements.push({
          ...identity,
          ...data,
          formulaDomain: 'unverified',
          mathFields,
        });
      } catch (error) {
        if (error instanceof ElementFailure)
          return failElement(error.diagnostics);
        if (error instanceof MathFailure)
          return failElement([{ ...error.diagnostic, stage: 'statement' }]);
        return failElement([
          {
            code: 'substitution-failed',
            path,
            stage: 'statement',
            message: 'Display element could not be instantiated.',
          },
        ]);
      }
      continue;
    }
    if (element.type === 'expression') {
      const math = instantiateMath(
        element.latex,
        context,
        generated.values,
        `${path}/latex`,
        false,
      );
      if (!math.ok)
        return failElement(
          math.diagnostics.map((d) => ({ ...d, stage: 'statement' })),
        );
      const label =
        element.label === undefined
          ? undefined
          : textTemplate(element.label, parameters, `${path}/label`);
      if (label && !label.ok) return failElement(label.diagnostics);
      elements.push({
        ...identity,
        type: 'expression',
        latex: math.value.displayLatex,
        math: math.value,
        ...(label?.ok ? { label: label.value } : {}),
      });
      continue;
    }
    const text = textTemplate(element.text, parameters, `${path}/text`);
    if (!text.ok) return failElement(text.diagnostics);
    if (element.type === 'text' || element.type === 'section') {
      elements.push({ ...identity, type: element.type, text: text.value });
    } else if (element.type === 'question') {
      if (element.expectedLatex === undefined) {
        const variants: string[] = [];
        for (const [i, source] of element.expectedTexts.entries()) {
          const value = textTemplate(
            source,
            parameters,
            `${path}/expectedTexts/${i}`,
          );
          if (!value.ok) return failElement(value.diagnostics);
          variants.push(value.value);
        }
        elements.push({
          ...identity,
          type: 'question',
          text: text.value,
          points: element.points,
          response: { format: 'text', kind: 'text' },
          policy: element.policy,
          expected: { kind: 'text', variants },
        });
        continue;
      }
      if (
        element.response.kind === 'real' ||
        element.response.kind === 'extended-real'
      ) {
        const numeric = prepareNumeric(
          element.expectedLatex,
          context,
          generated.values,
          `${path}/expectedLatex`,
          element.response.kind === 'extended-real',
        );
        if (!numeric.ok)
          return failElement(
            numeric.diagnostics.map((d) => ({ ...d, stage: 'expected' })),
          );
        elements.push({
          ...identity,
          type: 'question',
          text: text.value,
          points: element.points,
          response: { format: 'latex', kind: element.response.kind },
          policy: element.policy,
          expected: { kind: 'real', math: numeric.value.math },
        });
        continue;
      }
      const math = instantiateMath(
        element.expectedLatex,
        context,
        generated.values,
        `${path}/expectedLatex`,
        element.response.kind === 'rational',
      );
      if (!math.ok)
        return failElement(
          math.diagnostics.map((d) => ({ ...d, stage: 'expected' })),
        );
      if (element.response.kind === 'rational' && !math.exact)
        return failElement([
          {
            stage: 'expected',
            code: 'not-calculable',
            path: `${path}/expectedLatex`,
            message: 'Missing exact rational result.',
          },
        ]);
      elements.push({
        ...identity,
        type: 'question',
        text: text.value,
        points: element.points,
        response: { format: 'latex', kind: element.response.kind },
        policy: element.policy,
        expected:
          element.response.kind === 'rational' && math.exact
            ? { kind: 'rational', math: math.value, value: math.exact }
            : { kind: 'expression', math: math.value },
      });
    } else {
      const rendered: Extract<PrivateElement, { type: 'mcq' }> = {
        ...identity,
        type: 'mcq',
        text: text.value,
        points: element.points,
        mode: element.mode,
        options: [],
        expected: {
          kind: 'selection',
          optionIds: [...element.expectedOptionIds],
        },
        optionMath: [],
      };
      const displays = new Set<string>();
      const ratios = new Set<string>();
      for (const [i, option] of element.options.entries()) {
        const op = `${path}/options/${i}/content`;
        let display: string;
        let ratio: string | undefined;
        if (option.content.format === 'text') {
          const content = textTemplate(
            option.content.text,
            parameters,
            `${op}/text`,
          );
          if (!content.ok) return failElement(content.diagnostics);
          display = content.value;
          rendered.options.push({
            id: option.id,
            content: { format: 'text', text: display },
          });
        } else {
          const math = instantiateMath(
            option.content.latex,
            context,
            generated.values,
            `${op}/latex`,
            true,
          );
          if (!math.ok)
            return failElement(
              math.diagnostics.map((d) => ({ ...d, stage: 'option' })),
            );
          if (!math.exact)
            return failElement([
              {
                stage: 'option',
                code: 'not-calculable',
                path: `${op}/latex`,
                message:
                  'QCM mathematical options require exact rational values.',
              },
            ]);
          display = math.value.displayLatex;
          ratio = `${math.exact.numerator}/${math.exact.denominator}`;
          rendered.optionMath.push({
            optionId: option.id,
            math: math.value,
            value: math.exact,
          });
          rendered.options.push({
            id: option.id,
            content: { format: 'latex', latex: display },
          });
        }
        if (displays.has(display) || (ratio !== undefined && ratios.has(ratio)))
          return failElement([
            {
              stage: 'option',
              code: 'collision',
              path: op,
              message: 'Options collide after instantiation.',
            },
          ]);
        displays.add(display);
        if (ratio !== undefined) ratios.add(ratio);
      }
      elements.push(rendered);
    }
  }
  const instance: ExerciseInstance = {
    schemaVersion: 5,
    instanceId: options.instanceId,
    definition,
    engineVersion: generated.replay.engineVersion,
    generation: {
      version: generated.replay.generationVersion,
      seed: generated.replay.seed,
      draws: generated.replay.draws,
      attempts: generated.replay.attempts,
      values: generated.values,
      groups: generated.groups,
      computed: generated.computed,
    },
    title: title.value,
    elements,
  };
  const checked = validate<ExerciseInstance>(instance, () => {});
  return checked.ok
    ? checked
    : {
        ok: false,
        diagnostics: checked.diagnostics.map((d) => ({
          ...d,
          stage: 'instance',
        })),
      };
}
/** Fresh objects at every public level, including nested QCM options and response. */
function projectElement(element: PrivateElement): PublicElement | undefined {
  const identity = {
    id: element.id,
    ...((element.type === 'question' || element.type === 'mcq') &&
    element.keyboard !== undefined
      ? { keyboard: element.keyboard }
      : {}),
    ...(element.sectionId === undefined
      ? {}
      : { sectionId: element.sectionId }),
  };
  if (isPrivateDisplayElement(element)) {
    if (element.type === 'hint' || element.type === 'explanation')
      return undefined;
    const data = mapDisplayData(
      element,
      {
        number(value) {
          return {
            numerator: value.numerator,
            denominator: value.denominator,
            latex: value.latex,
          };
        },
        text(value) {
          return value;
        },
        formula(value) {
          return value;
        },
      },
      '',
    );
    if (data.type === 'hint' || data.type === 'explanation') return undefined;
    return { ...identity, ...data, formulaDomain: 'unverified' };
  }
  switch (element.type) {
    case 'text':
    case 'section':
      return { ...identity, type: element.type, text: element.text };
    case 'expression':
      return {
        ...identity,
        type: 'expression',
        latex: element.latex,
        ...(element.label === undefined ? {} : { label: element.label }),
      };
    case 'question':
      return {
        ...identity,
        type: 'question',
        text: element.text,
        points: element.points,
        response: {
          format: element.response.format,
          kind: element.response.kind,
        },
      };
    case 'mcq':
      return {
        ...identity,
        type: 'mcq',
        text: element.text,
        points: element.points,
        mode: element.mode,
        options: element.options.map((option) => ({
          id: option.id,
          content:
            option.content.format === 'text'
              ? { format: 'text', text: option.content.text }
              : { format: 'latex', latex: option.content.latex },
        })),
      };
  }
}
