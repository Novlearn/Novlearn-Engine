/** Shared, bounded identifier convention; this does not parse mathematical source. */
const reserved = new Set([
  'e',
  'i',
  'sin',
  'cos',
  'tan',
  'ln',
  'exp',
  'sqrt',
  'infinity',
  'constructor',
  'prototype',
]);

export function isMathName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[a-z][A-Za-z0-9]{0,31}$/.exec(value)?.[0] === value &&
    !reserved.has(value) &&
    value.toLowerCase() !== 'infinity'
  );
}
