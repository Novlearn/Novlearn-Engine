export {
  validateDefinition,
  validateSubmission,
} from './contracts/validation.js';
export type {
  ContractDiagnostic,
  ChoiceParameterV1,
  DecimalParameterV1,
  ExerciseDefinitionV1,
  IntegerParameterV1,
  GenerationParameterV1,
  JsonObject,
  JsonValue,
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
  GeneratedValueV1,
  GenerationDiagnostic,
} from './generation/variables.js';
