export {
  validateDefinition,
  validateSubmission,
} from './contracts/validation.js';
export type {
  JsonValue,
  JsonObject,
  IntegerVariableDefinition,
  DecimalVariableDefinition,
  ChoiceVariableDefinition,
  ScalarVariableDefinition,
  TupleVariableDefinition,
  ComputedVariableDefinition,
  VariableDefinition,
  ComparisonOperand,
  ComparisonConstraint,
  GenerationDefinition,
  ComputedBinding,
  GeneratedGroup,
  FreeVariableDefinition,
  RationalValue,
  InstantiatedMath,
  AnswerSubmission,
  ElementIdentity,
  OptionContent,
  ExerciseElement,
  QuestionDefinition,
  AnswerDefinition,
  ExerciseDefinition,
  PublicElement,
  ExpectedAnswer,
  PrivateElement,
  GeneratedScalarValue,
  GeneratedValue,
  ExerciseInstance,
  PublicInstance,
  ContractDiagnostic,
  ValidationResult,
} from './contracts/types.js';
export { parseMathInput } from './math/input.js';
export type {
  MathInputContext,
  MathInputDiagnostic,
  MathInputResult,
  MathSyntax,
} from './math/input.js';
export { generateVariables } from './generation/variables.js';
export type {
  GenerateVariablesOptions,
  GenerateVariablesResult,
  GenerationDiagnostic,
  GenerationReplay,
} from './generation/variables.js';
export { instantiateExercise, projectPublicInstance } from './instantiation.js';
export type {
  InstantiateExerciseOptions,
  InstantiateExerciseResult,
  InstantiationDiagnostic,
} from './instantiation.js';
