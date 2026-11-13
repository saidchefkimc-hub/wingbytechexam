import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Maximize2,
  ShieldAlert,
  GraduationCap,
  ShieldCheck,
  FileQuestion,
  Lock,
  Award,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { isFullscreenSupported } from '../utils/fullscreen';
import { getStudentAttempts, MAX_ALLOWED_ATTEMPTS } from '../utils/storage';
import { unlockAudio } from '../utils/audio';

interface StudentWelcomeProps {
  onStartExam: (studentName: string) => Promise<void>;
  onOpenTeacherAdmin: () => void;
  violationMessage?: string | null;
  onClearViolation?: () => void;
  isLoading?: boolean;
}

export const StudentWelcome: React.FC<StudentWelcomeProps> = ({
  onStartExam,
  onOpenTeacherAdmin,
  violationMessage,
  onClearViolation,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  const supported = isFullscreenSupported();

  // Check student's attempt count as they type their name
  useEffect(() => {
    if (name.trim().length >= 2) {
      const count = getStudentAttempts(name.trim());
      setAttemptsUsed(count);
    } else {
      setAttemptsUsed(0);
    }
  }, [name]);

  const isExhausted = attemptsUsed >= MAX_ALLOWED_ATTEMPTS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onClearViolation) onClearViolation();

    const trimmed = name.trim();

    if (!supported) {
      setError(
        'Your browser does not support the HTML5 Fullscreen API. Please use Google Chrome, Microsoft Edge, Firefox, or Safari on desktop.'
      );
      return;
    }

    if (trimmed.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    const currentAttempts = getStudentAttempts(trimmed);
    if (currentAttempts >= MAX_ALLOWED_ATTEMPTS) {
      setError('You have exhausted your allowed attempts.');
      return;
    }

    setError(null);
    setIsStarting(true);
    unlockAudio();

    try {
      await onStartExam(trimmed);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          'Failed to enter full screen. Please ensure browser permissions allow full screen and try again.'
      );
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-animated-exam text-white font-sans select-none-strict">
      {/* Top Bar with Logos and Discreet Admin Access */}
      <header className="w-full shrink-0 sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-2.5">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-3">
          {/* Examination Portal Header Branding */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-blue-500/30">
              <GraduationCap className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>MCQ Examination Portal</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Proctored
                </span>
              </h1>
              <p className="text-[11px] text-blue-200/70">
                HTML &bull; CSS &bull; Bootstrap Assessment
              </p>
            </div>
          </div>

          {/* Teacher Admin Access */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTeacherAdmin}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-blue-200 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5"
              title="Instructor Portal"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Teacher Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Content Area with Safe Scrolling */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto w-full">
        <div className="w-full max-w-sm sm:max-w-md my-auto animate-float-in">
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-white/15 shadow-2xl shadow-blue-950/80 relative overflow-hidden">
            {/* Ambient Jadara Blue & Gold Glow */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header with Title */}
            <div className="text-center space-y-1 mb-3.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Web Development Assessment</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Candidate Login
              </h2>
              <p className="text-xs text-blue-200/80">
                HTML, CSS &amp; Bootstrap MCQ Examination
              </p>
            </div>

            {/* Fullscreen Violation Alert */}
            {violationMessage && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-500/20 border-2 border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 animate-shake shadow-lg">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-rose-300">Attempt Notice</p>
                  <p className="mt-0.5 text-rose-100 font-medium leading-relaxed text-[11px]">
                    {violationMessage}
                  </p>
                </div>
              </div>
            )}

            {!supported && (
              <div className="mb-3.5 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">Fullscreen Required</p>
                  <p className="mt-0.5 text-amber-200/90 leading-relaxed text-[11px]">
                    Your browser does not support full screen mode. Please use Google Chrome, Edge, or Safari on desktop.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Input: Candidate Full Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="student-full-name"
                    className="block text-xs font-bold text-blue-200 uppercase tracking-wider"
                  >
                    Candidate Full Name <span className="text-pink-400">*</span>
                  </label>

                  {name.trim().length >= 2 && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isExhausted
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : attemptsUsed === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isExhausted
                        ? '0 Attempts Left'
                        : attemptsUsed === 1
                        ? 'Attempt 2 of 2 (Sequential)'
                        : 'Attempt 1 of 2 (Sequential)'}
                    </span>
                  )}
                </div>

                <input
                  id="student-full-name"
                  type="text"
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your full name"
                  disabled={isStarting || isLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:bg-white/15 focus:ring-3 focus:ring-amber-500/20 transition-all text-white placeholder-slate-400 text-sm font-semibold outline-none"
                />
              </div>

              {/* Error / Exhausted Message */}
              {isExhausted ? (
                <div className="p-3 rounded-xl bg-rose-500/20 border-2 border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-rose-300">Access Blocked</p>
                    <p className="mt-0.5 text-rose-100 font-medium leading-relaxed text-[11px]">
                      You have exhausted your allowed attempts.
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-shake">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              {/* Guidelines & Rules Card */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs text-blue-200/80">
                <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Examination &amp; Attempt Rules</span>
                </div>
                <p className="flex items-start gap-1.5 text-[11px]">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Maximum 2 Attempts:</strong> Questions are always presented in strict sequential order from 1 to the end.
                  </span>
                </p>
                <p className="flex items-start gap-1.5 text-[11px]">
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Proctoring &amp; 10s Timer:</strong> Leaving full screen triggers a <strong>10-second</strong> countdown before attempt cancellation.
                  </span>
                </p>
                <p className="flex items-start gap-1.5 text-[11px]">
                  <Award className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Direct Evaluation:</strong> Results are automatically emailed to your instructor upon submission.
                  </span>
                </p>
              </div>

              {/* Start Exam Button */}
              <button
                type="submit"
                disabled={isStarting || isLoading || !supported || isExhausted}
                className="w-full py-2.5 sm:py-3 px-5 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 hover:from-amber-300 hover:to-yellow-100 active:scale-98 transition-all shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-hover-sweep animate-pulse-glow"
              >
                <Maximize2 className="w-4 h-4 text-slate-950" />
                <span>
                  {isExhausted
                    ? 'Attempts Exhausted'
                    : isStarting
                    ? 'Entering Full Screen...'
                    : attemptsUsed === 1
                    ? 'Start Attempt #2'
                    : 'Start Exam'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 text-center text-[11px] text-blue-200/50 py-2.5 px-4 w-full">
        MCQ Assessment Portal &bull; Web3Forms Direct Evaluation Service
      </footer>
    </div>
  );
};
