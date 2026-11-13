import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { Question, OptionLetter } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';

const LOCAL_STORAGE_KEY_QUESTIONS = 'proctored_exam_questions_bank';

// Helper to get local questions fallback
function getLocalQuestions(): Question[] {
  if (typeof window === 'undefined') return DEFAULT_QUESTIONS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_QUESTIONS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_QUESTIONS, JSON.stringify(DEFAULT_QUESTIONS));
      return DEFAULT_QUESTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUESTIONS;
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

function saveLocalQuestions(questions: Question[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
  } catch (err) {
    console.error('Failed to save questions to local storage:', err);
  }
}

export const QuestionService = {
  /**
   * Fetch questions from Firestore (or local fallback)
   */
  async getQuestions(): Promise<Question[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'questions'));
        if (querySnapshot.empty) {
          // If Firestore is empty, auto-seed with default questions
          await this.seedDefaultQuestions();
          return DEFAULT_QUESTIONS;
        }

        const questions: Question[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          questions.push({
            id: docSnap.id,
            question: data.question || '',
            options: data.options || ['', '', '', ''],
            answerKey: (data.answerKey || 'A') as OptionLetter,
          });
        });

        // Numeric sort 1..N first, then custom string IDs in chronological order
        return questions.sort((a, b) => {
          const numA = /^\d+$/.test(a.id.trim()) ? parseInt(a.id.trim(), 10) : NaN;
          const numB = /^\d+$/.test(b.id.trim()) ? parseInt(b.id.trim(), 10) : NaN;
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          if (!isNaN(numA)) return -1;
          if (!isNaN(numB)) return 1;
          return a.id.localeCompare(b.id);
        });
      } catch (err) {
        console.warn('Firestore fetch failed, falling back to local question bank:', err);
        return getLocalQuestions();
      }
    } else {
      return getLocalQuestions();
    }
  },

  /**
   * Add a new question to Firestore (or local fallback)
   */
  async addQuestion(questionData: Omit<Question, 'id'>): Promise<Question> {
    const newId = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newQuestion: Question = {
      ...questionData,
      id: newId,
    };

    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'questions', newId);
        await setDoc(docRef, {
          question: newQuestion.question,
          options: newQuestion.options,
          answerKey: newQuestion.answerKey,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Firestore addDoc error:', err);
      }
    }

    // Always keep local storage updated in sync
    const current = getLocalQuestions();
    saveLocalQuestions([...current, newQuestion]);

    return newQuestion;
  },

  /**
   * Update an existing question
   */
  async updateQuestion(id: string, updates: Partial<Omit<Question, 'id'>>): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'questions', id);
        await updateDoc(docRef, updates);
      } catch (err) {
        console.error('Firestore updateDoc error:', err);
      }
    }

    const current = getLocalQuestions();
    const idx = current.findIndex((q) => q.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updates };
      saveLocalQuestions(current);
    }
  },

  /**
   * Delete a question
   */
  async deleteQuestion(id: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'questions', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error('Firestore deleteDoc error:', err);
      }
    }

    const current = getLocalQuestions();
    const filtered = current.filter((q) => q.id !== id);
    saveLocalQuestions(filtered);
  },

  /**
   * Seed default 40 questions to Firestore
   */
  async seedDefaultQuestions(): Promise<number> {
    if (isFirebaseConfigured() && db) {
      for (const q of DEFAULT_QUESTIONS) {
        const docRef = doc(db, 'questions', q.id);
        await setDoc(docRef, {
          question: q.question,
          options: q.options,
          answerKey: q.answerKey,
        });
      }
    }
    saveLocalQuestions(DEFAULT_QUESTIONS);
    return DEFAULT_QUESTIONS.length;
  },
};
