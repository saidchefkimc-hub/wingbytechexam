import React from 'react';
import { CheckCircle2, RotateCcw, MailCheck } from 'lucide-react';
import { getStudentAttempts, MAX_ALLOWED_ATTEMPTS } from '../utils/storage';

interface StudentCompletionProps {
  studentName: string;
  onRestart: () => void;
}

export const StudentCompletion: React.FC<StudentCompletionProps> = ({
  studentName,
  onRestart,
}) => {
  const attemptsUsed = getStudentAttempts(studentName);
  const remainingAttempts = Math.max(0, MAX_ALLOWED_ATTEMPTS - attemptsUsed);

  return (
    <div className="min-h-screen w-full flex flex-col bg-animated-exam text-white font-sans select-none-strict">
      {/* Top Header */}
      <header className="w-full shrink-0 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-2.5">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
          <div className="text-sm font-extrabold text-white tracking-tight">
            MCQ Examination Portal
          </div>

          <div className="text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
            Assessment Completed
          </div>
        </div>
      </header>

      {/* Main Centered Content Area with Safe Scrolling */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto w-full">
        <div className="w-full max-w-sm sm:max-w-md my-auto animate-float-in">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-5 sm:p-6 text-center shadow-2xl shadow-blue-950/80 relative overflow-hidden">
            {/* Ambient Jadara Gold & Blue Glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Checkmark Badge */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-300 text-slate-950 mb-3 shadow-xl shadow-amber-500/30 animate-pop-in">
              <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight mb-1">
              Submission Confirmed
            </h2>

            {/* Exact Required Prompt Text */}
            <p className="text-sm sm:text-base text-amber-300 font-bold mb-3.5 leading-relaxed">
              Your exam has been submitted.
            </p>

            {/* Candidate & Dispatch Summary */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-blue-200/80 space-y-2 mb-5 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <MailCheck className="w-4 h-4 text-emerald-400" />
                  <span>Candidate: {studentName}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {attemptsUsed} of {MAX_ALLOWED_ATTEMPTS} Used
                </span>
              </div>

              <p className="text-[11px] text-blue-200/70 leading-relaxed">
                Your graded answers and final note have been dispatched directly to your instructor's inbox via Web3Forms.
              </p>

              {remainingAttempts > 0 ? (
                <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px]">
                  You have <strong>{remainingAttempts} attempt remaining</strong>. Questions will remain in sequential order from 1 to the end.
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-[11px]">
                  You have completed both allowed attempts for this examination.
                </div>
              )}
            </div>

            {/* Exact Required Restart / Return Button */}
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-3 sm:py-3.5 px-5 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 hover:from-amber-300 hover:to-yellow-100 active:scale-98 shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer btn-hover-sweep animate-pulse-glow"
            >
              <RotateCcw className="w-4 h-4 text-slate-950" />
              <span>Return to Main Page (Retake Exam)</span>
            </button>
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
