export type OptionLetter = 'A' | 'B' | 'C' | 'D';

export interface Question {
  id: string;
  question: string;
  options: string[]; // Exactly 4 options
  answerKey: OptionLetter;
}

export type StudentAnswers = Record<string, OptionLetter>;

export interface ExamGradingResult {
  studentName: string;
  score: number;
  total: number;
  percentage: number;
  submittedAt: string;
  breakdown: {
    questionNumber: number;
    questionText: string;
    studentChoice: OptionLetter | 'Unanswered';
    correctAnswer: OptionLetter;
    isCorrect: boolean;
  }[];
}

export interface StudentRecord {
  id: string;
  name: string;
}
