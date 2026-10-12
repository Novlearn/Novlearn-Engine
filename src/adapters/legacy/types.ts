import type {
  ComparisonConstraint,
  ExerciseDefinition,
  FreeVariableDefinition,
  GradingPolicy,
  JsonObject,
  QuestionResponse,
} from '../../contracts/types.js';

/** Decisions belong to a reviewed server-side import recipe, never learner input. */
export interface LegacyRecipe {
  id?: string;
  revision: string;
  defaults: 'observed-creator-v1';
  variables: FreeVariableDefinition[];
  aliases?: Record<string, string>;
  constraints?: ComparisonConstraint[];
  questions: Record<
    string,
    { response: QuestionResponse; policy: GradingPolicy }
  >;
  /** Required when the database envelope and embedded flags disagree. */
  flags?: { flash?: 'row' | 'content'; calculator?: 'row' | 'content' };
  decisions: string[];
}
export interface LegacyMapping {
  scope: 'row' | 'content' | 'competences';
  path: string;
  disposition: 'mapped' | 'preserved-private';
  target?: string;
}
export interface LegacyReport {
  adapterVersion: 'legacy-to-canonical-v1';
  sourceFormat:
    'database-row-v1' | 'creator-publication-v1' | 'creator-document-v1';
  classification: 'adaptable' | 'blocked';
  original: JsonObject;
  mappings: LegacyMapping[];
  decisions: string[];
  diagnostics: { path: string; message: string }[];
  /** No production write or historical seed replay occurs during conversion. */
  productionMigration: false;
}
export type LegacyAdaptation =
  | { ok: true; definition: ExerciseDefinition; report: LegacyReport }
  | { ok: false; report: LegacyReport };
