/** JSON-only extensions are private, uninterpreted data. */
export type JsonValue =
  null | boolean | number | string | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export interface IntegerVariableDefinition {
  name: string;
  kind: 'integer';
  min: number;
  max: number;
  exclusions: number[];
}

/** Exact decimal grid: coefficient / 10^precision, precision from 0 to 6. */
export interface DecimalVariableDefinition {
  name: string;
  kind: 'decimal';
  min: number;
  max: number;
  precision: number;
  exclusions: number[];
}

/** Unique finite numeric choices; duplicates are invalid, never implicit weights. */
export interface ChoiceVariableDefinition {
  name: string;
  kind: 'choice';
  values: number[];
  exclusions?: number[];
}

export type ScalarVariableDefinition =
  | IntegerVariableDefinition
  | DecimalVariableDefinition
  | ChoiceVariableDefinition;
/** The component domains type and admit rows; exclusions remove whole rows. */
export type TupleVariableDefinition = {
  id: string;
  kind: 'tuple';
  components: ScalarVariableDefinition[];
} & ({ mode: 'generate' } | { mode: 'choice'; values: number[][] });

export interface ComputedVariableDefinition {
  name: string;
  kind: 'computed';
  latex: string;
  restrictions?: {
    domain: 'integer' | 'rational';
    min?: number;
    max?: number;
    exclusions?: number[];
  };
}

export type VariableDefinition =
  | ScalarVariableDefinition
  | TupleVariableDefinition
  | ComputedVariableDefinition;
export type ComparisonOperand =
  { variable: string } | { constant: number } | { latex: string };
export interface ComparisonConstraint {
  kind: 'comparison';
  left: ComparisonOperand;
  operator: '<' | '<=' | '>' | '>=' | '==' | '!=';
  right: ComparisonOperand;
}
export interface GenerationDefinition {
  schemaVersion: 5;
  definitions: VariableDefinition[];
  constraints: ComparisonConstraint[];
  maxAttempts: number;
  maxDraws: number;
}
export interface ComputedBinding {
  name: string;
  dependencies: string[];
}

/** Ordered bindings into the sole values map, with no duplicate numeric state. */
export interface GeneratedGroup {
  id: string;
  components: string[];
}

export interface FreeVariableDefinition {
  name: string;
  domain: 'real' | 'integer';
}

/** Exact bounded rational; no rounded JavaScript quotient is stored. */
export interface RationalValue {
  kind: 'rational';
  numerator: number;
  denominator: number;
}

/** Sources and raw substitution are distinct from the derived display. */
export interface InstantiatedMath {
  source: string;
  syntax: import('../math/input.js').MathSyntax;
  substituted: import('../math/input.js').MathSyntax;
  displayLatex: string;
}

export interface AnswerSubmission {
  schemaVersion: 5;
  instanceId: string;
  questionId: string;
  /** Original input, including empty or incomplete input; parsing is a later step. */
  answer: { format: 'latex'; source: string };
}

export interface ElementIdentity {
  id: string;
  sectionId?: string;
  /** Private author metadata, never projected. */
  extensions?: JsonObject;
}

export type OptionContent =
  { format: 'text'; text: string } | { format: 'latex'; latex: string };

export type ExerciseElement =
  | (ElementIdentity & { type: 'text'; text: string })
  | (ElementIdentity & { type: 'section'; text: string })
  | (ElementIdentity & { type: 'expression'; latex: string; label?: string })
  | (ElementIdentity & {
      type: 'question';
      text: string;
      points: number;
      response: { format: 'latex'; kind: 'rational' | 'expression' };
      expectedLatex: string;
      policy: { domain: 'rational' | 'polynomial'; form: 'value-only' };
    })
  | (ElementIdentity & {
      type: 'mcq';
      text: string;
      points: number;
      mode: 'single' | 'multiple';
      options: { id: string; content: OptionContent }[];
      expectedOptionIds: string[];
    });

export type QuestionDefinition = Extract<
  ExerciseElement,
  { type: 'question' | 'mcq' }
>;
export type AnswerDefinition =
  | Pick<
      Extract<QuestionDefinition, { type: 'question' }>,
      'response' | 'expectedLatex' | 'policy'
    >
  | Pick<Extract<QuestionDefinition, { type: 'mcq' }>, 'expectedOptionIds'>;
export interface ExerciseDefinition {
  schemaVersion: 5;
  kind: 'composed';
  id: string;
  revision: string;
  title: string;
  generation: GenerationDefinition;
  variables: FreeVariableDefinition[];
  elements: ExerciseElement[];
  extensions?: JsonObject;
}
export type PublicElement =
  | { id: string; sectionId?: string; type: 'text'; text: string }
  | { id: string; sectionId?: string; type: 'section'; text: string }
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
      options: { id: string; content: OptionContent }[];
    };

export type ExpectedAnswer =
  | { kind: 'rational'; math: InstantiatedMath; value: RationalValue }
  | { kind: 'expression'; math: InstantiatedMath }
  | { kind: 'selection'; optionIds: string[] };

/** Expected data stays attached to the question ID, never its array index. */
export type PrivateElement =
  | Extract<PublicElement, { type: 'text' | 'section' }>
  | (Extract<PublicElement, { type: 'expression' }> & {
      math: InstantiatedMath;
    })
  | (Extract<PublicElement, { type: 'question' }> & {
      expected: Exclude<ExpectedAnswer, { kind: 'selection' }>;
      policy: { domain: 'rational' | 'polynomial'; form: 'value-only' };
    })
  | (Extract<PublicElement, { type: 'mcq' }> & {
      expected: Extract<ExpectedAnswer, { kind: 'selection' }>;
      optionMath: {
        optionId: string;
        math: InstantiatedMath;
        value: RationalValue;
      }[];
    });

export type GeneratedScalarValue =
  | { kind: 'integer'; value: number }
  | { kind: 'decimal'; coefficient: number; precision: number }
  | { kind: 'choice'; value: number };
export type GeneratedValue = GeneratedScalarValue | RationalValue;
/** Official, detached server snapshot. No client provenance is authenticated here. */
export interface ExerciseInstance {
  schemaVersion: 5;
  instanceId: string;
  definition: ExerciseDefinition;
  engineVersion: '0.1.0';
  generation: {
    version: 'mulberry32-rejection-v1';
    seed: string;
    draws: number;
    attempts: number;
    values: Record<string, GeneratedValue>;
    groups: GeneratedGroup[];
    computed: ComputedBinding[];
  };
  title: string;
  elements: PrivateElement[];
}
export interface PublicInstance {
  schemaVersion: 5;
  instanceId: string;
  title: string;
  elements: PublicElement[];
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
