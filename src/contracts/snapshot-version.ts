import type { ExerciseInstance } from './types.js';

/** Version gate for trusted persisted snapshots; not authentication or a JSON validator. */
export function supportedSnapshotVersion(instance: ExerciseInstance): boolean {
  return (
    instance.schemaVersion === 5 &&
    instance.engineVersion === '0.1.0' &&
    instance.generation?.version === 'mulberry32-rejection-v1'
  );
}
