import type {
  ContractDiagnostic,
  PrivateInstanceV1,
  PublicInstanceV1,
} from './contracts/types.js';
import { validate, validateDefinition } from './contracts/validation.js';
import { generateVariables } from './generation/variables.js';
import type {
  GenerateVariablesOptions,
  GenerationDiagnostic,
} from './generation/variables.js';
import { instantiateMath } from './math/substitution.js';
import type { InstantiationMathDiagnostic } from './math/substitution.js';

export interface InstantiateExerciseOptions extends GenerateVariablesOptions {
  /** Opaque ID supplied by the trusted caller, independent of the seed. */
  instanceId: string;
  instantiationVersion?: 'rational-instance-v1';
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
    | 'instance';
};
export type InstantiateExerciseResult =
  | { ok: true; value: PrivateInstanceV1 }
  | { ok: false; diagnostics: InstantiationDiagnostic[] };

/** A bounded text template, never interpreted as algebra or inline LaTeX. */
function textTemplate(
  source: string,
  parameters: Record<string, number>,
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
      if (
        o.instantiationVersion !== undefined &&
        o.instantiationVersion !== 'rational-instance-v1'
      )
        v.issue(
          '/instantiationVersion',
          'unknown-version',
          'Only rational-instance-v1 is supported.',
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
  const generated = generateVariables(d.parameters, {
    seed: o.seed,
    ...(o.generationVersion === undefined
      ? {}
      : { generationVersion: o.generationVersion }),
  });
  if (!generated.ok)
    return {
      ok: false,
      diagnostics: generated.diagnostics.map((issue) => ({
        ...issue,
        stage: 'generation',
      })),
    };
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
): PublicInstanceV1 {
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
