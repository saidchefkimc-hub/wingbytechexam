/**
 * ============================================================================
 * HYBRID PROCTORED MCQ EXAM SYSTEM (STUDENT EXAM & TEACHER ADMIN)
 * ============================================================================
 * - Question Bank: Stored & managed live via Firebase Firestore (with fallback).
 * - Teacher Admin: Hardcoded login (saidchefki / 12344321) with CRUD & overflow-y-auto.
 * - Attempt Limits: Max 2 attempts.
 *   - All attempts display questions in strict sequential order (1 to end).
 *   - Attempt #3+: Blocked with "You have exhausted your allowed attempts."
 * - Proctoring: Fullscreen mode with 10-second countdown timer on violation.
 * - Quit Button: Surrender exam with confirmation dialog.
 * - Submission: Graded locally with Final Note on 40 emailed via Web3Forms API:
 *   Key: 9dd29dc7-0423-4192-94dc-137bf9e8b8b8
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { StudentWelcome } from './components/StudentWelcome';
import { StudentExam } from './components/StudentExam';
import { StudentCompletion } from './components/StudentCompletion';
import { TeacherAdmin } from './components/TeacherAdmin';
import { QuestionService } from './services/questionService';
import { Question, StudentAnswers } from './types';
import {
  clearStudentAnswers,
  getStudentAttempts,
  incrementStudentAttempts,
  hasExhaustedAttempts,
} from './utils/storage';
import { exitFullscreen } from './utils/fullscreen';

/**
 * Sort questions strictly in sequential order from 1 to the end.
 * Numeric IDs (1..40) are ordered numerically; custom teacher-added IDs follow chronologically.
 */
function sortQuestionsSequentially(items: Question[]): Question[] {
  return [...items].sort((a, b) => {
    const numA = /^\d+$/.test(a.id.trim()) ? parseInt(a.id.trim(), 10) : NaN;
    const numB = /^\d+$/.test(b.id.trim()) ? parseInt(b.id.trim(), 10) : NaN;

    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return a.id.localeCompare(b.id);
  });
}

export default function App() {
  // Navigation mode: 'student' | 'teacher_admin'
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      return (
        hash.includes('admin') ||
        hash.includes('teacher') ||
        path.includes('admin') ||
        path.includes('teacher')
      );
    }
    return false;
  });

  // Student Examination stage: 'welcome' | 'in_exam' | 'completion'
  const [stage, setStage] = useState<'welcome' | 'in_exam' | 'completion'>('welcome');
  const [studentName, setStudentName] = useState<string>('');
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState<number>(1);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<StudentAnswers>({});
  const [violationMessage, setViolationMessage] = useState<string | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);

  // Sync hash changes (e.g. user enters #admin)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('admin') || hash.includes('teacher')) {
        setIsAdminMode(true);
      } else {
        setIsAdminMode(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Action: Student clicks "Start Exam"
  const handleStartExam = async (name: string) => {
    setIsLoadingQuestions(true);

    try {
      // 1. Verify student attempt limits
      if (hasExhaustedAttempts(name)) {
        throw new Error('You have exhausted your allowed attempts.');
      }

      const completedCount = getStudentAttempts(name);
      const attemptNum = completedCount + 1; // 1 or 2

      // 2. Fetch live questions from Firestore
      const liveQuestions = await QuestionService.getQuestions();

      // Always display questions in strict sequential order from 1 to the end
      const orderedQuestions = sortQuestionsSequentially(liveQuestions);

      // 3. Clear old progress & initialize new session
      clearStudentAnswers();
      setAnswers({});
      setActiveQuestions(orderedQuestions);
      setStudentName(name);
      setCurrentAttemptNumber(attemptNum);
      setViolationMessage(null);
      setStage('in_exam');
    } catch (err: any) {
      console.error('Failed to start exam:', err);
      throw err;
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Action: Exam submitted and successfully dispatched via Web3Forms
  const handleSubmittedSuccess = async () => {
    // Increment completed attempt counter
    incrementStudentAttempts(studentName);
    clearStudentAnswers();
    await exitFullscreen();
    setStage('completion');
  };

  // Action: Violation kicked student back to Welcome Screen (10s timer)
  const handleViolationKick = async (message: string) => {
    // Increment attempt counter due to violation
    incrementStudentAttempts(studentName);
    clearStudentAnswers();
    await exitFullscreen();
    setViolationMessage(message);
    setStage('welcome');
  };

  // Action: Student clicked "Quit / Surrender Exam"
  const handleQuitSurrender = async () => {
    // Increment attempt counter upon surrender
    incrementStudentAttempts(studentName);
    clearStudentAnswers();
    await exitFullscreen();
    setViolationMessage('You surrendered the exam. 1 of your 2 allowed attempts was consumed.');
    setStage('welcome');
  };

  // Action: Restart Exam / Return to Main Page from Completion Screen
  const handleRestartExam = () => {
    clearStudentAnswers();
    setAnswers({});
    setViolationMessage(null);
    setStage('welcome');
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      {isAdminMode ? (
        /* Teacher Admin Panel (Login + Question CRUD) */
        <TeacherAdmin
          onBackToExam={() => {
            setIsAdminMode(false);
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '#/');
            }
          }}
        />
      ) : (
        /* Student Exam Area */
        <>
          {stage === 'welcome' && (
            <StudentWelcome
              onStartExam={handleStartExam}
              onOpenTeacherAdmin={() => {
                setIsAdminMode(true);
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '#admin');
                }
              }}
              violationMessage={violationMessage}
              onClearViolation={() => setViolationMessage(null)}
              isLoading={isLoadingQuestions}
            />
          )}

          {stage === 'in_exam' && activeQuestions.length > 0 && (
            <StudentExam
              studentName={studentName}
              attemptNumber={currentAttemptNumber}
              questions={activeQuestions}
              initialAnswers={answers}
              onSubmittedSuccess={handleSubmittedSuccess}
              onViolationKick={handleViolationKick}
              onQuitSurrender={handleQuitSurrender}
            />
          )}

          {stage === 'completion' && (
            <StudentCompletion
              studentName={studentName}
              onRestart={handleRestartExam}
            />
          )}
        </>
      )}
    </div>
  );
}
