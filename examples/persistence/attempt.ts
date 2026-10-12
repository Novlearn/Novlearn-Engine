import type {
  ExerciseDefinition,
  ExerciseInstance,
  AnswerSubmission,
  CorrectionResult,
} from 'novlearn-exercise-engine';

/** Application-owned identity: archive and installed dependency lock are both pinned. */
export interface ArtifactIdentity {
  schemaVersion: 1;
  packageVersion: string;
  tarballSha256: string;
  dependencyLockSha256: string;
}

/** Private storage contract; never accept or project this envelope from/to a learner. */
export interface PersistedAttempt {
  envelopeVersion: 1;
  attemptId: string;
  ownerId: string;
  artifact: ArtifactIdentity;
  publishedDefinition: {
    definitionVersion: 1;
    id: string;
    revision: string;
    definition: ExerciseDefinition;
  };
  official: ExerciseInstance;
  submission: AnswerSubmission;
  correction: CorrectionResult;
}
