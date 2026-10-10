/** JSON-only extensions are private, uninterpreted data. */
export type JsonValue =
  null | boolean | number | string | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export interface IntegerParameterV1 {
  name: string;
  kind: 'integer';
  min: number;
  max: number;
  exclusions: number[];
}

/** Exact decimal grid: coefficient / 10^precision, precision from 0 to 6. */
export interface DecimalParameterV1 {
  name: string;
  kind: 'decimal';
  min: number;
  max: number;
  precision: number;
  exclusions: number[];
}

/** Unique finite numeric choices; duplicates are invalid, never implicit weights. */
export interface ChoiceParameterV1 {
  name: string;
  kind: 'choice';
  values: number[];
}

/** Generation contract; ExerciseDefinitionV1 remains the integer-only family. */
export type GenerationParameterV1 =
  IntegerParameterV1 | DecimalParameterV1 | ChoiceParameterV1;

export interface VariableV1 {
  name: string;
  domain: 'real' | 'integer';
}

export interface StatementV1 {
  text: string;
  /** Author-supplied source, not a parsed or mathematically validated expression. */
  latex: string;
}

export interface QuestionV1 {
  id: string;
  text: string;
  points: number;
}

/** First native family, selected from historical row 103. Not a legacy schema. */
export interface ExerciseDefinitionV1 {
  schemaVersion: 1;
  kind: 'rational-value';
  id: string;
  revision: string;
  title: string;
  parameters: IntegerParameterV1[];
  /** Symbols in the statement; the expected answer is a scalar rational value. */
  variables: VariableV1[];
  statement: StatementV1;
  question: QuestionV1 & {
    expectedLatex: string;
    policy: { domain: 'rational'; form: 'value-only' };
  };
  extensions?: JsonObject;
}

/** Exact bounded rational; no rounded JavaScript quotient is stored. */
export interface RationalValueV1 {
  kind: 'rational';
  numerator: number;
  denominator: number;
}

/** Sources and raw substitution are distinct from the derived display. */
export interface InstantiatedMathV1 {
  source: string;
  syntax: import('../math/input.js').MathSyntax;
  substituted: import('../math/input.js').MathSyntax;
  displayLatex: string;
}

/** Trusted server snapshot produced by instantiateExercise. */
export interface PrivateInstanceV1 {
  schemaVersion: 1;
  instanceId: string;
  definition: ExerciseDefinitionV1;
  engineVersion: string;
  instantiationVersion: 'rational-instance-v1';
  generation: {
    version: string;
    seed: string;
    draws: number;
    parameters: Record<string, number>;
  };
  display: { title: string; statement: StatementV1; question: QuestionV1 };
  expectedLatex: string;
  statementMath: InstantiatedMathV1;
  expectedMath: InstantiatedMathV1 & { value: RationalValueV1 };
}

/** Allowlisted display DTO, detached from the private snapshot. */
export interface PublicInstanceV1 {
  schemaVersion: 1;
  instanceId: string;
  title: string;
  statement: StatementV1;
  question: QuestionV1;
}

export interface SubmissionV1 {
  schemaVersion: 1;
  instanceId: string;
  questionId: string;
  /** Original input, including empty or incomplete input; parsing is a later step. */
  answer: { format: 'latex'; source: string };
}

/** Flat composition; v1 and its integer snapshot remain independently supported. */
export interface ElementIdentityV2 {
  id: string;
  sectionId?: string;
  /** Private author metadata, never projected. */
  extensions?: JsonObject;
}

export type OptionContentV2 =
  { format: 'text'; text: string } | { format: 'latex'; latex: string };

export type ExerciseElementV2 =
  | (ElementIdentityV2 & { type: 'text'; text: string })
  | (ElementIdentityV2 & { type: 'section'; text: string })
  | (ElementIdentityV2 & { type: 'expression'; latex: string; label?: string })
  | (ElementIdentityV2 & {
      type: 'question';
      text: string;
      points: number;
      response: { format: 'latex'; kind: 'rational' | 'expression' };
      expectedLatex: string;
      policy: { domain: 'rational' | 'polynomial'; form: 'value-only' };
    })
  | (ElementIdentityV2 & {
      type: 'mcq';
      text: string;
      points: number;
      mode: 'single' | 'multiple';
      options: { id: string; content: OptionContentV2 }[];
      expectedOptionIds: string[];
    });

export interface ExerciseDefinitionV2 {
  schemaVersion: 2;
  kind: 'composed';
  id: string;
  revision: string;
  title: string;
  parameters: GenerationParameterV1[];
  variables: VariableV1[];
  elements: ExerciseElementV2[];
  extensions?: JsonObject;
}

export type PublicElementV2 =
  | { id: string; sectionId?: string; type: 'text' | 'section'; text: string }
  | {
      id: string;
      sectionId?: string;
      type: 'expression';
      latex: string;
      label?: string;
    }
  | {
      id: string;
      sectionId?: string;
      type: 'question';
      text: string;
      points: number;
      response: { format: 'latex'; kind: 'rational' | 'expression' };
    }
  | {
      id: string;
      sectionId?: string;
      type: 'mcq';
      text: string;
      points: number;
      mode: 'single' | 'multiple';
      options: { id: string; content: OptionContentV2 }[];
    };

export type ExpectedAnswerV2 =
  | { kind: 'rational'; math: InstantiatedMathV1; value: RationalValueV1 }
  | { kind: 'expression'; math: InstantiatedMathV1 }
  | { kind: 'selection'; optionIds: string[] };

/** Expected data stays attached to the question ID, never its array index. */
export type PrivateElementV2 =
  | Extract<PublicElementV2, { type: 'text' | 'section' }>
  | (Extract<PublicElementV2, { type: 'expression' }> & {
      math: InstantiatedMathV1;
    })
  | (Extract<PublicElementV2, { type: 'question' }> & {
      expected: Exclude<ExpectedAnswerV2, { kind: 'selection' }>;
      policy: { domain: 'rational' | 'polynomial'; form: 'value-only' };
    })
  | (Extract<PublicElementV2, { type: 'mcq' }> & {
      expected: Extract<ExpectedAnswerV2, { kind: 'selection' }>;
      optionMath: {
        optionId: string;
        math: InstantiatedMathV1;
        value: RationalValueV1;
      }[];
    });

export interface PrivateInstanceV2 {
  schemaVersion: 2;
  instanceId: string;
  definition: ExerciseDefinitionV2;
  engineVersion: string;
  instantiationVersion: 'composed-instance-v2';
  generation: {
    version: string;
    seed: string;
    draws: number;
    parameters: Record<
      string,
      import('../generation/variables.js').GeneratedValueV1
    >;
  };
  title: string;
  elements: PrivateElementV2[];
}

export interface PublicInstanceV2 {
  schemaVersion: 2;
  instanceId: string;
  title: string;
  elements: PublicElementV2[];
}

export interface ContractDiagnostic {
  /** JSON Pointer; the empty string denotes the root. */
  path: string;
  code:
    | 'invalid-json'
    | 'limit'
    | 'type'
    | 'value'
    | 'unknown-version'
    | 'unknown-field'
    | 'collision'
    | 'unsupported-type'
    | 'impossible-constraints';
  message: string;
}

export type ValidationResult<T> =
  { ok: true; value: T } | { ok: false; diagnostics: ContractDiagnostic[] };
