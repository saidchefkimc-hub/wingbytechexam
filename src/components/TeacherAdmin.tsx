import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  Database,
  ArrowLeft,
  X,
  Check,
  AlertTriangle,
  FileQuestion,
  ClipboardCheck,
  Copy,
  Users,
  UserPlus,
} from 'lucide-react';
import { Question, OptionLetter, StudentRecord } from '../types';
import { QuestionService } from '../services/questionService';
import { StudentService } from '../services/studentService';
import { isFirebaseConfigured } from '../firebase/config';

interface TeacherAdminProps {
  onBackToExam: () => void;
}

export const TeacherAdmin: React.FC<TeacherAdminProps> = ({ onBackToExam }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Question CRUD state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add / Edit Modal state
  const [editingQuestion, setEditingQuestion] = useState<{
    id?: string;
    question: string;
    options: [string, string, string, string];
    answerKey: OptionLetter;
    isNew: boolean;
  } | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Student Roster CRUD state (alphabetically sorted)
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [studentError, setStudentError] = useState<string | null>(null);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState('');
  const [studentDeleteConfirmId, setStudentDeleteConfirmId] = useState<string | null>(null);

  const isRealFirebase = isFirebaseConfigured();

  // Load questions & students when authenticated
  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const list = await QuestionService.getQuestions();
      setQuestions(list);
    } catch (err) {
      console.error('Error loading questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const list = await StudentService.getStudents();
      setStudents(list);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadQuestions();
      loadStudents();
    }
  }, [isAuthenticated]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Login submission: hardcoded username "saidchefki" and password "12344321"
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'saidchefki' && password === '12344321') {
      setIsAuthenticated(true);
      setLoginError(null);
    } else {
      setLoginError('Invalid username or password. Access denied.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  // Open add new question modal
  const handleAddNew = () => {
    setEditingQuestion({
      question: '',
      options: ['', '', '', ''],
      answerKey: 'A',
      isNew: true,
    });
  };

  // Open edit modal for existing question
  const handleEdit = (q: Question) => {
    setEditingQuestion({
      id: q.id,
      question: q.question,
      options: [
        q.options[0] || '',
        q.options[1] || '',
        q.options[2] || '',
        q.options[3] || '',
      ],
      answerKey: q.answerKey,
      isNew: false,
    });
  };

  // Save question (Add or Edit)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    if (!editingQuestion.question.trim()) {
      alert('Question text cannot be empty');
      return;
    }

    if (editingQuestion.options.some((o) => !o.trim())) {
      alert('All 4 options (A, B, C, D) are required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingQuestion.isNew) {
        await QuestionService.addQuestion({
          question: editingQuestion.question.trim(),
          options: editingQuestion.options.map((o) => o.trim()),
          answerKey: editingQuestion.answerKey,
        });
        showToast('New question added to Question Bank!');
      } else if (editingQuestion.id) {
        await QuestionService.updateQuestion(editingQuestion.id, {
          question: editingQuestion.question.trim(),
          options: editingQuestion.options.map((o) => o.trim()),
          answerKey: editingQuestion.answerKey,
        });
        showToast('Question updated successfully!');
      }
      await loadQuestions();
      setEditingQuestion(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save question');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete question
  const handleConfirmDelete = async (id: string) => {
    try {
      await QuestionService.deleteQuestion(id);
      await loadQuestions();
      showToast('Question removed from Question Bank.');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete question');
    }
  };

  // Seed default questions
  const handleSeedDefaults = async () => {
    if (!confirm('This will seed the default 40 web development questions. Proceed?')) return;
    setIsLoading(true);
    try {
      const count = await QuestionService.seedDefaultQuestions();
      await loadQuestions();
      showToast(`Seeded ${count} standard questions to Question Bank!`);
    } catch (err) {
      console.error(err);
      alert('Failed to seed default questions');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const textMatch = q.question.toLowerCase().includes(searchTerm.toLowerCase());
    const optMatch = q.options.some((o) => o.toLowerCase().includes(searchTerm.toLowerCase()));
    return textMatch || optMatch;
  });

  const letterToIndex: Record<OptionLetter, number> = { A: 0, B: 1, C: 2, D: 3 };

  const handleCopyCorrectionTable = async () => {
    const lines = questions.map((q, idx) => {
      const optIdx = letterToIndex[q.answerKey] ?? 0;
      const ansText = q.options[optIdx] || '';
      return `${idx + 1}. ${q.question} -> ${q.answerKey}) ${ansText}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast('Complete correction table copied to clipboard!');
    } catch {
      showToast('Copy failed — please select and copy from the table.');
    }
  };

  // Add student handler
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStudentName.trim();
    if (!trimmed) {
      setStudentError('Please enter a student name.');
      return;
    }

    setIsSavingStudent(true);
    setStudentError(null);
    try {
      await StudentService.addStudent(trimmed);
      await loadStudents();
      setNewStudentName('');
      showToast(`Added "${trimmed}" to student roster (sorted alphabetically).`);
    } catch (err: any) {
      setStudentError(err?.message || 'Failed to add student.');
    } finally {
      setIsSavingStudent(false);
    }
  };

  // Save modified student name
  const handleSaveStudentEdit = async (id: string) => {
    const trimmed = editingStudentName.trim();
    if (!trimmed) {
      setStudentError('Student name cannot be empty.');
      return;
    }

    setIsSavingStudent(true);
    setStudentError(null);
    try {
      await StudentService.updateStudent(id, trimmed);
      await loadStudents();
      setEditingStudentId(null);
      setEditingStudentName('');
      showToast(`Updated student to "${trimmed}" (sorted alphabetically).`);
    } catch (err: any) {
      setStudentError(err?.message || 'Failed to update student.');
    } finally {
      setIsSavingStudent(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (id: string) => {
    setIsSavingStudent(true);
    setStudentError(null);
    try {
      await StudentService.deleteStudent(id);
      await loadStudents();
      setStudentDeleteConfirmId(null);
      showToast('Student removed from roster.');
    } catch (err: any) {
      setStudentError(err?.message || 'Failed to delete student.');
    } finally {
      setIsSavingStudent(false);
    }
  };

  // 1. LOGIN SCREEN (Strictly protected with "saidchefki" / "12344321")
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-animated-exam text-white font-sans select-none-strict">
        <header className="w-full shrink-0 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-2.5">
          <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToExam}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-teal-200 hover:text-white border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Student Exam</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-teal-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Instructor Portal</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto w-full">
          <div className="w-full max-w-sm sm:max-w-md my-auto animate-float-in">
            <div
              className={`bg-slate-900/90 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-teal-500/30 shadow-2xl shadow-teal-950/80 relative overflow-hidden ${
                isShaking ? 'animate-shake' : ''
              }`}
            >
              <div className="text-center space-y-1.5 mb-5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-400 to-amber-300 text-slate-950 mb-2 shadow-lg shadow-teal-500/30 font-black">
                  <Lock className="h-6 w-6 text-slate-950" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Teacher Admin Login
                </h2>
                <p className="text-xs text-teal-200/80">
                  Enter your instructor credentials to manage the Question Bank.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-teal-200 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="saidchefki"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 focus:border-teal-400 text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-teal-200 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 focus:border-teal-400 text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none transition"
                  />
                </div>

                {loginError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-teal-400 via-teal-300 to-amber-300 hover:from-teal-300 hover:to-amber-200 active:scale-98 shadow-xl shadow-teal-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer btn-hover-sweep mt-1"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to Admin Dashboard</span>
                </button>
              </form>
            </div>
          </div>
        </main>

        <footer className="shrink-0 text-center text-[11px] text-teal-200/50 py-2.5 px-4 w-full">
          Protected Instructor Console &bull; Firebase Firestore Backed
        </footer>
      </div>
    );
  }

  // 2. AUTHENTICATED QUESTION MANAGER (CRUD)
  return (
    <div className="min-h-screen w-full bg-slate-950 text-white font-sans flex flex-col">
      {/* Top Header - Sticky with z-50 */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-400 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-md">
              <FileQuestion className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  Question Bank Manager
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {isRealFirebase ? 'Firestore Live' : 'Local Fallback Storage'}
                </span>
              </div>
              <p className="text-xs text-teal-200/70">
                Authenticated as <strong className="text-white">saidchefki</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToExam}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-teal-200 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Student Exam</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAuthenticated(false)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body - Enabled overflow-y-auto to easily scroll through all 40 questions */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6 space-y-5 flex-1 overflow-y-auto">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-teal-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions or choices..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-teal-400 text-white placeholder-slate-400 text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSeedDefaults}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-teal-200 border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Reset or seed the 40 standard questions"
            >
              <Database className="w-4 h-4 text-amber-400" />
              <span>Seed 40 Default Questions</span>
            </button>

            <button
              type="button"
              onClick={handleAddNew}
              className="px-4 py-2 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-teal-400 to-amber-300 hover:from-teal-300 hover:to-amber-200 shadow-md transition flex items-center gap-1.5 cursor-pointer btn-hover-sweep"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Question</span>
            </button>
          </div>
        </div>

        {/* Toast notification */}
        {toastMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-pop-in">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Student Roster Management Section (Add / Modify / Remove Alphabetically) */}
        <section className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-400 to-teal-300 flex items-center justify-center text-slate-950 shrink-0 shadow-md">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                    Student Roster Management
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {students.length} Students (A–Z)
                  </span>
                </div>
                <p className="text-xs text-teal-200/70">
                  Add or modify student names shown in the candidate dropdown (automatically sorted alphabetically).
                </p>
              </div>
            </div>

            {/* Add Student Inline Form */}
            <form onSubmit={handleAddStudent} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => {
                  setNewStudentName(e.target.value);
                  if (studentError) setStudentError(null);
                }}
                placeholder="New student full name..."
                disabled={isSavingStudent}
                className="flex-1 md:w-56 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/15 focus:border-teal-400 text-white placeholder-slate-400 text-xs outline-none"
              />
              <button
                type="submit"
                disabled={isSavingStudent}
                className="px-3.5 py-2 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-300 hover:from-blue-300 hover:to-emerald-200 shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </button>
            </form>
          </div>

          {studentError && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{studentError}</span>
              </div>
              <button
                type="button"
                onClick={() => setStudentError(null)}
                className="text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Alphabetical Student Roster Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {students.map((stu, idx) => {
              const isEditing = editingStudentId === stu.id;
              const isConfirmingDelete = studentDeleteConfirmId === stu.id;

              return (
                <div
                  key={stu.id}
                  className="px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 hover:border-teal-500/40 flex items-center justify-between gap-2 transition"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editingStudentName}
                        onChange={(e) => setEditingStudentName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveStudentEdit(stu.id);
                          } else if (e.key === 'Escape') {
                            setEditingStudentId(null);
                            setEditingStudentName('');
                          }
                        }}
                        autoFocus
                        disabled={isSavingStudent}
                        className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-slate-900 border border-teal-400 text-white text-xs font-semibold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveStudentEdit(stu.id)}
                        disabled={isSavingStudent}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                        title="Save student name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudentId(null);
                          setEditingStudentName('');
                        }}
                        className="p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : isConfirmingDelete ? (
                    <div className="flex items-center justify-between gap-2 flex-1 text-xs">
                      <span className="text-rose-300 font-semibold truncate">
                        Remove {stu.name}?
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(stu.id)}
                          disabled={isSavingStudent}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentDeleteConfirmId(null)}
                          className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 hover:text-white text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-white truncate">
                          {stu.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudentId(stu.id);
                            setEditingStudentName(stu.name);
                            setStudentDeleteConfirmId(null);
                            setStudentError(null);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-white/10 transition cursor-pointer"
                          title="Modify student name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentDeleteConfirmId(stu.id);
                            setEditingStudentId(null);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition cursor-pointer"
                          title="Remove student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Questions Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 hover:border-teal-500/40 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center shrink-0 border border-teal-500/30">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Answer Key: {q.answerKey}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(q)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-white/10 transition cursor-pointer"
                      title="Edit question"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(q.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition cursor-pointer"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-white leading-snug">
                  {q.question}
                </p>
              </div>

              {/* Options Preview */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/10">
                {(['A', 'B', 'C', 'D'] as OptionLetter[]).map((letter, optIdx) => {
                  const isKey = q.answerKey === letter;
                  return (
                    <div
                      key={letter}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 truncate ${
                        isKey
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold'
                          : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      <span className="font-bold shrink-0">{letter})</span>
                      <span className="truncate">{q.options[optIdx]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 bg-slate-900/50 border border-white/10 rounded-2xl p-6 text-slate-400 text-xs">
            No questions found matching your search.
          </div>
        )}

        {/* Exam Correction Answer Key Table (at the end of Teacher Admin) */}
        <section className="pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-300 flex items-center justify-center text-slate-950 shrink-0 shadow-md">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                    Exam Correction Table (Answer Key)
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {questions.length} Questions
                  </span>
                </div>
                <p className="text-xs text-teal-200/70">
                  Complete reference list of every question and its official correction.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCorrectionTable}
              disabled={questions.length === 0}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-teal-200 hover:text-white border border-white/10 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Copy className="w-3.5 h-3.5 text-amber-300" />
              <span>Copy Correction Key</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/90 border-b border-white/10 text-teal-300 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-bold w-14 text-center">#</th>
                  <th className="py-3 px-4 font-bold">Question</th>
                  <th className="py-3 px-4 font-bold w-28 text-center">Key</th>
                  <th className="py-3 px-4 font-bold">Correction (Correct Answer)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {questions.map((q, idx) => {
                  const optIdx = letterToIndex[q.answerKey] ?? 0;
                  const correctText = q.options[optIdx] || '';
                  return (
                    <tr
                      key={`correction-${q.id}`}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-teal-300">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 text-slate-100 font-medium leading-snug">
                        {q.question}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold text-xs">
                          {q.answerKey}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 font-mono font-semibold">
                          {correctText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {questions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No questions available in the bank.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Add / Edit Question Modal */}
      {editingQuestion && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setEditingQuestion(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-teal-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingQuestion.isNew ? 'Add New Question' : 'Edit Question'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-teal-200 uppercase tracking-wider mb-1">
                  Question Text <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingQuestion.question}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question: e.target.value,
                    })
                  }
                  placeholder="e.g. Which HTML tag creates a paragraph?"
                  className="w-full p-2.5 rounded-xl bg-white/10 border border-white/15 focus:border-teal-400 text-white placeholder-slate-400 outline-none text-xs"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block font-bold text-teal-200 uppercase tracking-wider">
                  Options (A, B, C, D) <span className="text-rose-400">*</span>
                </label>
                {(['A', 'B', 'C', 'D'] as OptionLetter[]).map((letter, optIdx) => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0 border border-teal-500/30">
                      {letter}
                    </span>
                    <input
                      type="text"
                      required
                      value={editingQuestion.options[optIdx]}
                      onChange={(e) => {
                        const newOpts = [...editingQuestion.options] as [string, string, string, string];
                        newOpts[optIdx] = e.target.value;
                        setEditingQuestion({
                          ...editingQuestion,
                          options: newOpts,
                        });
                      }}
                      placeholder={`Option ${letter} text`}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 focus:border-teal-400 text-white placeholder-slate-400 outline-none text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Answer Key Dropdown */}
              <div>
                <label className="block font-bold text-teal-200 uppercase tracking-wider mb-1">
                  Correct Answer Key <span className="text-rose-400">*</span>
                </label>
                <select
                  value={editingQuestion.answerKey}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      answerKey: e.target.value as OptionLetter,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-bold outline-none focus:border-teal-400 cursor-pointer text-xs"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-3.5 py-2 rounded-xl border border-white/20 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-amber-300 hover:from-teal-300 hover:to-amber-200 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-rose-500/50 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-white my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Question?</h3>
                <p className="text-xs text-rose-200/70">
                  This permanently removes the question from the Firestore question bank.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 rounded-xl border border-white/20 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-md cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-[11px] text-teal-200/50 py-2 border-t border-white/5">
        Question Bank live in Firestore &bull; Instructor: saidchefki
      </footer>
    </div>
  );
};
