import type {
  ContractDiagnostic,
  ExerciseDefinitionV1,
  ExerciseDefinitionV2,
  ExerciseDefinitionV3,
  ExerciseDefinitionV4,
  PrivateInstanceV4,
  PublicInstanceV4,
  PrivateInstanceV1,
  PrivateInstanceV2,
  PrivateInstanceV3,
  PrivateElementV2,
  PublicElementV2,
  PublicInstanceV1,
  PublicInstanceV2,
  PublicInstanceV3,
} from './contracts/types.js';
import { validate, validateDefinition } from './contracts/validation.js';
import { generateVariables } from './generation/variables.js';
import type {
  GenerateVariablesOptions,
  GenerationDiagnostic,
  GeneratedValueV3,
  GenerateVariablesResult,
} from './generation/variables.js';
import { instantiateMath } from './math/substitution.js';
import type { InstantiationMathDiagnostic } from './math/substitution.js';

export interface InstantiateExerciseOptions extends GenerateVariablesOptions {
  /** Opaque ID supplied by the trusted caller, independent of the seed. */
  instanceId: string;
  instantiationVersion?:
    | 'rational-instance-v1'
    | 'composed-instance-v2'
    | 'composed-instance-v3'
    | 'composed-instance-v4';
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
export type InstantiateExerciseResult<
  T =
    | PrivateInstanceV1
    | PrivateInstanceV2
    | PrivateInstanceV3
    | PrivateInstanceV4,
> =
  | { ok: true; value: T }
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

/** Validate, generate with Lot 4, instantiate with CortexJS, then construct a detached snapshot.
 * No partial instance, correction, implicit legacy adaptation or client authority.
 */
export function instantiateExercise(
  definition: ExerciseDefinitionV1,
  options: InstantiateExerciseOptions,
): InstantiateExerciseResult<PrivateInstanceV1>;
export function instantiateExercise(
  definition: ExerciseDefinitionV2,
  options: InstantiateExerciseOptions,
): InstantiateExerciseResult<PrivateInstanceV2>;
export function instantiateExercise(
  definition: ExerciseDefinitionV3,
  options: InstantiateExerciseOptions,
): InstantiateExerciseResult<PrivateInstanceV3>;
export function instantiateExercise(
  definition: ExerciseDefinitionV4,
  options: InstantiateExerciseOptions,
): InstantiateExerciseResult<PrivateInstanceV4>;
export function instantiateExercise(
  definition: unknown,
  options: InstantiateExerciseOptions,
): InstantiateExerciseResult;
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
      const o = v.object(data, '', [
        'instanceId',
        'seed',
        'generationVersion',
        'instantiationVersion',
      ]);
      v.text(o.instanceId, '/instanceId', 128);
      const version =
        checked.value.schemaVersion === 4
          ? 'composed-instance-v4'
          : checked.value.schemaVersion === 1
            ? 'rational-instance-v1'
            : checked.value.schemaVersion === 3
              ? 'composed-instance-v3'
              : 'composed-instance-v2';
      if (
        o.instantiationVersion !== undefined &&
        o.instantiationVersion !== version
      )
        v.issue(
          '/instantiationVersion',
          'unknown-version',
          `This definition requires ${version}.`,
        );
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
  const d = checked.value;
  const generated = generateVariables(
    d.schemaVersion === 3 || d.schemaVersion === 4
      ? d.generation
      : d.parameters,
    {
      seed: o.seed,
      ...(o.generationVersion === undefined
        ? d.schemaVersion === 4
          ? { generationVersion: 'variables-v3' as const }
          : d.schemaVersion === 3
            ? { generationVersion: 'variables-v2' as const }
            : {}
        : { generationVersion: o.generationVersion }),
    },
  );
  if (!generated.ok)
    return {
      ok: false,
      diagnostics: generated.diagnostics.map((issue) => ({
        ...issue,
        path: d.schemaVersion >= 3 ? `/generation${issue.path}` : issue.path,
        stage: 'generation',
      })),
    };
  if (d.schemaVersion !== 1) return instantiateComposition(d, generated, o);
  const parameters: Record<string, number> = {};
  for (const [name, value] of Object.entries(generated.values)) {
    // validateDefinition enforces integer-only; no coercion of future value kinds.
    if (value.kind !== 'integer')
      return {
        ok: false,
        diagnostics: [
          {
            stage: 'generation',
            code: 'unsupported-type',
            path: `/parameters/${name}`,
            message: 'Native v1 requires integer parameters.',
          },
        ],
      };
    parameters[name] = value.value;
  }
  const title = textTemplate(d.title, parameters, '/title');
  if (!title.ok) return title;
  const statementText = textTemplate(
    d.statement.text,
    parameters,
    '/statement/text',
  );
  if (!statementText.ok) return statementText;
  const questionText = textTemplate(
    d.question.text,
    parameters,
    '/question/text',
  );
  if (!questionText.ok) return questionText;
  const context = {
    parameters: d.parameters.map((p) => p.name),
    variables: d.variables.map((v) => v.name),
  };
  const statement = instantiateMath(
    d.statement.latex,
    context,
    generated.values,
    '/statement/latex',
    false,
  );
  if (!statement.ok)
    return {
      ok: false,
      diagnostics: statement.diagnostics.map((issue) => ({
        ...issue,
        stage: 'statement',
      })),
    };
  const expected = instantiateMath(
    d.question.expectedLatex,
    context,
    generated.values,
    '/question/expectedLatex',
    true,
  );
  if (!expected.ok)
    return {
      ok: false,
      diagnostics: expected.diagnostics.map((issue) => ({
        ...issue,
        stage: 'expected',
      })),
    };
  if (!expected.exact)
    return {
      ok: false,
      diagnostics: [
        {
          stage: 'expected',
          code: 'not-calculable',
          path: '/question/expectedLatex',
          message: 'Missing exact rational result.',
        },
      ],
    };
  const instance: PrivateInstanceV1 = {
    schemaVersion: 1,
    instanceId: o.instanceId,
    definition: d,
    engineVersion: generated.replay.engineVersion,
    instantiationVersion: 'rational-instance-v1',
    generation: {
      version: generated.replay.generationVersion,
      seed: generated.replay.seed,
      draws: generated.replay.draws,
      parameters,
    },
    display: {
      title: title.value,
      statement: {
        text: statementText.value,
        latex: statement.value.displayLatex,
      },
      question: {
        id: d.question.id,
        text: questionText.value,
        points: d.question.points,
      },
    },
    expectedLatex: expected.value.displayLatex,
    statementMath: statement.value,
    expectedMath: { ...expected.value, value: expected.exact },
  };
  // Final inert JSON and budgets validation; math invariants have already been checked above.
  const result = validate<PrivateInstanceV1>(instance, () => {});
  if (!result.ok)
    return {
      ok: false,
      diagnostics: result.diagnostics.map((issue) => ({
        ...issue,
        stage: 'instance',
      })),
    };
  return result;
}

/** Select fields explicitly; caller must supply an official, trusted server snapshot. */
export function projectPublicInstance(
  instance: PrivateInstanceV1,
): PublicInstanceV1;
export function projectPublicInstance(
  instance: PrivateInstanceV2,
): PublicInstanceV2;
export function projectPublicInstance(
  instance: PrivateInstanceV3,
): PublicInstanceV3;
export function projectPublicInstance(
  instance: PrivateInstanceV4,
): PublicInstanceV4;
export function projectPublicInstance(
  instance:
    | PrivateInstanceV1
    | PrivateInstanceV2
    | PrivateInstanceV3
    | PrivateInstanceV4,
): PublicInstanceV1 | PublicInstanceV2 | PublicInstanceV3 | PublicInstanceV4;
export function projectPublicInstance(
  instance:
    | PrivateInstanceV1
    | PrivateInstanceV2
    | PrivateInstanceV3
    | PrivateInstanceV4,
): PublicInstanceV1 | PublicInstanceV2 | PublicInstanceV3 | PublicInstanceV4 {
  if (instance.schemaVersion !== 1)
    return {
      schemaVersion: instance.schemaVersion,
      instanceId: instance.instanceId,
      title: instance.title,
      elements: instance.elements.map(projectElement),
    };
  return {
    schemaVersion: 1,
    instanceId: instance.instanceId,
    title: instance.display.title,
    statement: {
      text: instance.display.statement.text,
      latex: instance.display.statement.latex,
    },
    question: {
      id: instance.display.question.id,
      text: instance.display.question.text,
      points: instance.display.question.points,
    },
  };
}

/** Exact decimal spelling for prose; no rounded quotient enters templates. */
function textValue(value: GeneratedValueV3): string {
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

function instantiateComposition(
  definition:
    ExerciseDefinitionV2 | ExerciseDefinitionV3 | ExerciseDefinitionV4,
  generated: Extract<GenerateVariablesResult, { ok: true }>,
  options: InstantiateExerciseOptions,
): InstantiateExerciseResult<
  PrivateInstanceV2 | PrivateInstanceV3 | PrivateInstanceV4
> {
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
  const elements: PrivateElementV2[] = [];
  for (const [index, element] of definition.elements.entries()) {
    const path = `/elements/${index}`;
    const identity = {
      id: element.id,
      ...(element.sectionId === undefined
        ? {}
        : { sectionId: element.sectionId }),
    };
    const failElement = (
      diagnostics: InstantiationDiagnostic[],
    ): InstantiateExerciseResult<
      PrivateInstanceV2 | PrivateInstanceV3 | PrivateInstanceV4
    > => ({
      ok: false,
      diagnostics: diagnostics.map((d) => ({
        ...d,
        elementId: element.id,
        ...(element.type === 'question' || element.type === 'mcq'
          ? { questionId: element.id }
          : {}),
      })),
    });
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
      const rendered: Extract<PrivateElementV2, { type: 'mcq' }> = {
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
  const common = {
    instanceId: options.instanceId,
    engineVersion: generated.replay.engineVersion,
    title: title.value,
    elements,
  };
  const generation = {
    version: generated.replay.generationVersion,
    seed: generated.replay.seed,
    draws: generated.replay.draws,
    parameters: generated.values,
  };
  let instance: PrivateInstanceV2 | PrivateInstanceV3 | PrivateInstanceV4;
  if (definition.schemaVersion === 4) {
    if (!('computed' in generated))
      return {
        ok: false,
        diagnostics: [
          {
            stage: 'generation',
            path: '/generationVersion',
            code: 'unsupported-version',
            message: 'Definition v4 requires variables-v3.',
          },
        ],
      };
    instance = {
      ...common,
      schemaVersion: 4,
      definition,
      instantiationVersion: 'composed-instance-v4',
      generation: {
        ...generation,
        version: 'variables-v3',
        attempts: generated.replay.attempts,
        groups: generated.groups,
        computed: generated.computed,
      },
    };
  } else if (definition.schemaVersion === 3) {
    if (!('groups' in generated) || 'computed' in generated)
      return {
        ok: false,
        diagnostics: [
          {
            stage: 'generation',
            path: '/generationVersion',
            code: 'unsupported-version',
            message: 'Definition v3 requires variables-v2.',
          },
        ],
      };
    instance = {
      ...common,
      schemaVersion: 3,
      definition,
      instantiationVersion: 'composed-instance-v3',
      generation: {
        ...generation,
        parameters: generated.values,
        version: 'variables-v2',
        attempts: generated.replay.attempts,
        groups: generated.groups,
      },
    };
  } else {
    if ('computed' in generated)
      return {
        ok: false,
        diagnostics: [
          {
            stage: 'generation',
            path: '/generationVersion',
            code: 'unsupported-version',
            message: 'Definition v2 requires scalar generation.',
          },
        ],
      };
    instance = {
      ...common,
      schemaVersion: 2,
      definition,
      instantiationVersion: 'composed-instance-v2',
      generation: { ...generation, parameters: generated.values },
    };
  }
  const checked = validate<
    PrivateInstanceV2 | PrivateInstanceV3 | PrivateInstanceV4
  >(instance, () => {});
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
function projectElement(element: PrivateElementV2): PublicElementV2 {
  const identity = {
    id: element.id,
    ...(element.sectionId === undefined
      ? {}
      : { sectionId: element.sectionId }),
  };
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
        response: { format: 'latex', kind: element.response.kind },
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
