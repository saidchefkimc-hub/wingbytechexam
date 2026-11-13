import { StudentAnswers } from '../types';

const STORAGE_KEY_ANSWERS = 'proctored_exam_answers';
const STORAGE_PREFIX_ATTEMPTS = 'mcq_completed_attempts:';
export const MAX_ALLOWED_ATTEMPTS = 2;

/**
 * Save current exam answers to localStorage immediately
 */
export function saveStudentAnswers(answers: StudentAnswers): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(answers));
  } catch (err) {
    console.error('Failed to autosave answers to localStorage:', err);
  }
}

/**
 * Load student answers from localStorage
 */
export function loadStudentAnswers(): StudentAnswers {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANSWERS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Clear current in-progress student answers
 */
export function clearStudentAnswers(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_ANSWERS);
  } catch (err) {
    console.error('Failed to clear answers from localStorage:', err);
  }
}

/**
 * Get number of completed/consumed attempts for a student name
 */
export function getStudentAttempts(studentName: string): number {
  if (typeof window === 'undefined' || !studentName.trim()) return 0;
  const key = STORAGE_PREFIX_ATTEMPTS + studentName.trim().toLowerCase();
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const val = parseInt(raw, 10);
      return isNaN(val) ? 0 : val;
    }
  } catch {
    return 0;
  }
  return 0;
}

/**
 * Increment and persist the completed attempts for a student
 */
export function incrementStudentAttempts(studentName: string): number {
  if (typeof window === 'undefined' || !studentName.trim()) return 1;
  const key = STORAGE_PREFIX_ATTEMPTS + studentName.trim().toLowerCase();
  const current = getStudentAttempts(studentName);
  const next = current + 1;
  try {
    localStorage.setItem(key, next.toString());
  } catch (err) {
    console.error('Failed to write attempt to localStorage:', err);
  }
  return next;
}

/**
 * Reset student attempts (used by teacher or testing)
 */
export function resetStudentAttempts(studentName: string): void {
  if (typeof window === 'undefined' || !studentName.trim()) return;
  const key = STORAGE_PREFIX_ATTEMPTS + studentName.trim().toLowerCase();
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to reset attempts:', err);
  }
}

/**
 * Check if the student has exhausted their maximum 2 attempts
 */
export function hasExhaustedAttempts(studentName: string): boolean {
  return getStudentAttempts(studentName) >= MAX_ALLOWED_ATTEMPTS;
}
