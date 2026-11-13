/**
 * Deterministic string hash function
 */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Mulberry32 32-bit PRNG
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Get the next attempt number for a student name from localStorage
 * Key: "mcq-attempts:" + lowercased name
 */
export function getStudentAttemptNumber(name: string): number {
  if (typeof window === 'undefined') return 1;
  const key = 'mcq-attempts:' + name.trim().toLowerCase();
  const stored = localStorage.getItem(key);
  const num = stored ? parseInt(stored, 10) : 0;
  return isNaN(num) || num < 1 ? 1 : num;
}

/**
 * Increment and save the student's attempt number in localStorage
 */
export function incrementStudentAttemptNumber(name: string): number {
  if (typeof window === 'undefined') return 1;
  const key = 'mcq-attempts:' + name.trim().toLowerCase();
  const current = getStudentAttemptNumber(name);
  const next = current + 1;
  try {
    localStorage.setItem(key, next.toString());
  } catch (err) {
    console.error('Failed to write attempt number to localStorage:', err);
  }
  return next;
}

/**
 * Set a student's attempt number directly in localStorage
 */
export function setStudentAttemptNumber(name: string, attemptNo: number): void {
  if (typeof window === 'undefined') return;
  const key = 'mcq-attempts:' + name.trim().toLowerCase();
  try {
    localStorage.setItem(key, attemptNo.toString());
  } catch (err) {
    console.error('Failed to write attempt number to localStorage:', err);
  }
}

/**
 * Deterministically shuffles the question IDs array using Fisher-Yates
 * based on hash(lowercased name + "|" + attemptNo) and mulberry32 PRNG.
 */
export function computeShuffledOrder(
  questionIds: number[],
  name: string,
  attemptNo: number
): number[] {
  const seedString = `${name.trim().toLowerCase()}|${attemptNo}`;
  const seed = hashString(seedString);
  const prng = mulberry32(seed);

  const array = [...questionIds];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
