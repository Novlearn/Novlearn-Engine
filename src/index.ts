export {
  validateDefinition,
  validateSubmission,
} from './contracts/validation.js';
export type {
  ContractDiagnostic,
  ChoiceParameterV1,
  DecimalParameterV1,
  ExerciseDefinitionV1,
  ExerciseDefinitionV2,
  ExerciseDefinitionV3,
  PrivateInstanceV3,
  PublicInstanceV3,
  ScalarParameterV2,
  TupleParameterV2,
  GenerationDefinitionV2,
  ComparisonOperandV2,
  ComparisonConstraintV2,
  GeneratedGroupV2,
  ExerciseElementV2,
  OptionContentV2,
  ExpectedAnswerV2,
  PrivateElementV2,
  PublicElementV2,
  PrivateInstanceV2,
  PublicInstanceV2,
  IntegerParameterV1,
  GenerationParameterV1,
  JsonObject,
  JsonValue,
  InstantiatedMathV1,
  RationalValueV1,
  PrivateInstanceV1,
  PublicInstanceV1,
  QuestionV1,
  StatementV1,
  SubmissionV1,
  ValidationResult,
  VariableV1,
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
  GenerateVariablesResultV1,
  GenerateVariablesResultV2,
  GeneratedValueV1,
  GenerationDiagnostic,
  GenerationReplayV2,
} from './generation/variables.js';
export { instantiateExercise, projectPublicInstance } from './instantiation.js';
export type {
  InstantiateExerciseOptions,
  InstantiateExerciseResult,
  InstantiationDiagnostic,
} from './instantiation.js';
