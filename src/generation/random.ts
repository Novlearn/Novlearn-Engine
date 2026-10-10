const UINT32_RANGE = 0x1_0000_0000;

/** Frozen Mulberry32 word stream, including zero seed, using ECMAScript uint32 ops. */
export function wordStream(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let word = Math.imul(state ^ (state >>> 15), state | 1);
    word ^= word + Math.imul(word ^ (word >>> 7), word | 61);
    return (word ^ (word >>> 14)) >>> 0;
  };
}

/** Unbiased rank mapping; exhaustion is a resource limit, never a domain proof. */
export function sampleIndex(
  size: number,
  nextWord: () => number,
): number | undefined {
  if (size === 1) return 0;
  const ceiling = UINT32_RANGE - (UINT32_RANGE % size);
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const word = nextWord();
    if (word < ceiling) return word % size;
  }
  return undefined;
}
