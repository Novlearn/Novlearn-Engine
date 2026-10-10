import type { ExerciseInstance } from 'novlearn-exercise-engine';

/** Test accessors select actual canonical elements; they do not adapt old inputs. */
export function element<
  T extends { elements: { type: string }[] },
  K extends T['elements'][number]['type'],
>(value: T, type: K): Extract<T['elements'][number], { type: K }> {
  const found = value.elements.find((e) => e.type === type);
  if (!found) throw new Error(`Missing ${type} element`);
  return found as Extract<T['elements'][number], { type: K }>;
}

export function answer(value: ExerciseInstance) {
  const expected = element(value, 'question').expected;
  if (expected.kind !== 'rational') throw new Error('Expected rational answer');
  return expected;
}
