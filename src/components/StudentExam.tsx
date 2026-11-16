import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  ShieldAlert,
  Maximize2,
  Check,
  HardDrive,
  LogOut,
  AlertTriangle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Question, OptionLetter, StudentAnswers } from '../types';
import { isCurrentlyFullscreen, enterFullscreen } from '../utils/fullscreen';
import { saveStudentAnswers } from '../utils/storage';
import { gradeStudentExam, sendExamViaWeb3Forms } from '../utils/submission';
import {
  startSoothingMusic,
  stopSoothingMusic,
  playOptionSelectSound,
  playNavClickSound,
  playSubmitSuccessSound,
  setAudioMuted,
  getAudioMuted,
} from '../utils/audio';

interface StudentExamProps {
  studentName: string;
  attemptNumber: number; // 1 or 2
  questions: Question[];
  initialAnswers: StudentAnswers;
  onSubmittedSuccess: () => void;
  onViolationKick: (message: string) => void;
  onQuitSurrender: () => void;
}

export const StudentExam: React.FC<StudentExamProps> = ({
  studentName,
  attemptNumber,
  questions,
  initialAnswers,
  onSubmittedSuccess,
  onViolationKick,
  onQuitSurrender,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswers>(initialAnswers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Fullscreen, tab-switch, & window resize proctoring state with 10-second timer
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [violationReason, setViolationReason] = useState<'fullscreen' | 'tab' | 'resize'>('fullscreen');
  const [countdown, setCountdown] = useState(10);
  const [isRetryingFullscreen, setIsRetryingFullscreen] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => getAudioMuted());

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isWarningActiveRef = useRef(false);
  const violationReasonRef = useRef<'fullscreen' | 'tab' | 'resize'>('fullscreen');
  const isTransitioningFsRef = useRef(false);
  const resizeMonitoringReadyRef = useRef(false);
  const baselineSizeRef = useRef<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Start soothing background music on mount and stop cleanly on unmount
  useEffect(() => {
    startSoothingMusic();
    return () => {
      stopSoothingMusic();
    };
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setAudioMuted(nextMuted);
    if (!nextMuted) {
      startSoothingMusic();
      playNavClickSound();
    }
  };

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentQuestion?.id];

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Clear countdown interval
  const clearTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // When attempt is voided due to 10-second countdown expiry
  const triggerViolationKick = useCallback(() => {
    clearTimer();
    isWarningActiveRef.current = false;
    setIsWarningActive(false);
    const reasonText =
      violationReasonRef.current === 'resize'
        ? 'browser window resize'
        : violationReasonRef.current === 'tab'
        ? 'tab switch'
        : 'full screen exit';
    onViolationKick(
      `Attempt lost due to ${reasonText} violation (10-second timer expired). You have used 1 attempt.`
    );
  }, [clearTimer, onViolationKick]);

  // Start 10-second countdown (without resetting an already-running countdown)
  const startWarningCountdown = useCallback(
    (reason: 'fullscreen' | 'tab' | 'resize') => {
      violationReasonRef.current = reason;
      setViolationReason(reason);

      if (isWarningActiveRef.current) {
        return;
      }

      isWarningActiveRef.current = true;
      setIsWarningActive(true);
      setCountdown(10);
      clearTimer();

      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            triggerViolationKick();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearTimer, triggerViolationKick]
  );

  const dismissWarning = useCallback(() => {
    clearTimer();
    isWarningActiveRef.current = false;
    setIsWarningActive(false);
    setCountdown(10);
    setIsRetryingFullscreen(false);
  }, [clearTimer]);

  // Proctoring listeners: fullscreenchange, visibilitychange, and window resize
  useEffect(() => {
    // Allow initial fullscreen transition on exam start to settle before capturing baseline dimensions
    const settleTimer = setTimeout(() => {
      baselineSizeRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      resizeMonitoringReadyRef.current = true;
    }, 600);

    const handleViolationCheck = () => {
      if (isTransitioningFsRef.current) return;

      const isFs = isCurrentlyFullscreen();
      const isTabHidden = document.hidden;

      if (isTabHidden) {
        startWarningCountdown('tab');
      } else if (!isFs) {
        startWarningCountdown('fullscreen');
      } else {
        // Re-entered fullscreen & visible: sync baseline after brief settle and dismiss warning
        setTimeout(() => {
          baselineSizeRef.current = {
            width: window.innerWidth,
            height: window.innerHeight,
          };
        }, 250);
        dismissWarning();
      }
    };

    const handleWindowResize = () => {
      if (!resizeMonitoringReadyRef.current || isTransitioningFsRef.current) {
        return;
      }

      const widthDiff = Math.abs(window.innerWidth - baselineSizeRef.current.width);
      const heightDiff = Math.abs(window.innerHeight - baselineSizeRef.current.height);
      const hasResizedSignificantly = widthDiff > 20 || heightDiff > 20;

      if (hasResizedSignificantly) {
        startWarningCountdown('resize');
      } else if (
        isWarningActiveRef.current &&
        violationReasonRef.current === 'resize' &&
        !document.hidden
      ) {
        // Student restored window back to its baseline dimensions
        dismissWarning();
      }
    };

    document.addEventListener('fullscreenchange', handleViolationCheck);
    document.addEventListener('webkitfullscreenchange', handleViolationCheck);
    document.addEventListener('visibilitychange', handleViolationCheck);
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(settleTimer);
      clearTimer();
      document.removeEventListener('fullscreenchange', handleViolationCheck);
      document.removeEventListener('webkitfullscreenchange', handleViolationCheck);
      document.removeEventListener('visibilitychange', handleViolationCheck);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [clearTimer, startWarningCountdown, dismissWarning]);

  // Return to fullscreen button handler
  const handleReturnToFullscreen = async () => {
    setIsRetryingFullscreen(true);
    isTransitioningFsRef.current = true;
    const success = await enterFullscreen();

    setTimeout(() => {
      isTransitioningFsRef.current = false;

      if (success || isCurrentlyFullscreen()) {
        baselineSizeRef.current = {
          width: window.innerWidth,
          height: window.innerHeight,
        };
        dismissWarning();
      } else {
        setIsRetryingFullscreen(false);
      }
    }, 350);
  };

  // Select option, play tactile click sound & autosave immediately to localStorage
  const handleSelectOption = (option: OptionLetter) => {
    playOptionSelectSound(option);
    const updated: StudentAnswers = {
      ...answers,
      [currentQuestion.id]: option,
    };
    setAnswers(updated);
    saveStudentAnswers(updated); // Autosave immediately!
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      playNavClickSound();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      playNavClickSound();
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Submit Exam handler: evaluate score, send Web3Forms email, clear localStorage answers
  const handleFinalSubmit = async () => {
    playSubmitSuccessSound();
    setIsSubmitting(true);

    try {
      // 1. Grade the student exam
      const gradingResult = gradeStudentExam(studentName, questions, answers);

      // 2. Dispatch email payload to teacher via Web3Forms API
      await sendExamViaWeb3Forms(gradingResult);

      // 3. Complete and advance to completion screen
      setShowSubmitConfirm(false);
      onSubmittedSuccess();
    } catch (err) {
      console.error('Submission error:', err);
      // Still allow completion so student is not stuck
      setShowSubmitConfirm(false);
      onSubmittedSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const optionLetters: OptionLetter[] = ['A', 'B', 'C', 'D'];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        <p>Loading examination questions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-animated-exam text-white font-sans select-none-strict">
      {/* Top Proctored Header - Sticky with z-50 */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3">
          {/* Candidate Info */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight truncate max-w-[120px] sm:max-w-none">
                  {studentName}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    attemptNumber === 2
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  Attempt {attemptNumber} of 2 (Sequential)
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-teal-300/80">
                <HardDrive className="w-3 h-3 text-emerald-400" />
                <span>Autosaved</span>
              </div>
            </div>
          </div>

          {/* Right Controls: Fullscreen status, Progress badge & Quit button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Full Screen</span>
            </div>

            <div className="px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/10 text-[11px] font-bold text-amber-300">
              {answeredCount} / {totalQuestions} Answered
            </div>

            {/* Soothing Music & Click Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`text-xs font-semibold px-2.5 py-1 sm:py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                muted
                  ? 'border-slate-600 text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white'
                  : 'border-amber-400/40 text-amber-300 bg-amber-500/15 hover:bg-amber-500/25'
              }`}
              title={muted ? 'Unmute background music & click sounds' : 'Mute background music & click sounds'}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{muted ? 'Muted' : 'Music On'}</span>
            </button>

            {/* Quit / Surrender Exam Button */}
            <button
              type="button"
              onClick={() => setShowQuitConfirm(true)}
              className="text-xs font-semibold px-2.5 py-1 sm:py-1.5 rounded-xl border border-rose-500/40 text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 transition cursor-pointer flex items-center gap-1"
              title="Surrender exam"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quit Exam</span>
            </button>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-800/80 h-1.5 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-yellow-300 transition-all duration-300 ease-out relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute inset-0 shimmer-progress" />
          </div>
        </div>
      </header>

      {/* Main Centered Content Area with Safe Scrolling */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto w-full">
        <div className="w-full max-w-lg sm:max-w-xl my-auto animate-float-in">
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-white/15 shadow-2xl shadow-blue-950/80 flex flex-col transition-all">
            {/* Question Counter & Status Indicator */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Question {currentIndex + 1} of {totalQuestions}
              </span>

              <div className="text-[10px] sm:text-xs font-semibold">
                {selectedAnswer ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> Option {selectedAnswer} Selected
                  </span>
                ) : (
                  <span className="text-amber-300/90">Unanswered</span>
                )}
              </div>
            </div>

            {/* Question Text */}
            <div className="min-h-[44px] flex items-center justify-center mb-3 sm:mb-4 px-1 text-center">
              {currentQuestion.question.includes('\n') ? (
                <div className="w-full space-y-1.5 text-center">
                  {currentQuestion.question.split('\n').map((line, idx) => (
                    <p key={idx} className="text-xs sm:text-sm font-bold text-slate-100 leading-snug">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <h2 className="text-xs sm:text-sm md:text-[15px] font-bold text-slate-100 tracking-normal leading-snug">
                  {currentQuestion.question}
                </h2>
              )}
            </div>

            {/* 4 Option Cards with Hover Lift (-translate-y-1) and Glowing Border */}
            <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
              {optionLetters.map((letter, idx) => {
                const optionText = currentQuestion.options[idx] || '';
                const isSelected = selectedAnswer === letter;
                const isCodeLike =
                  optionText.includes('<') ||
                  optionText.startsWith('.') ||
                  optionText.includes('=') ||
                  optionText.includes(';');

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleSelectOption(letter)}
                    className={`w-full text-left py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-xl border transition-all duration-200 transform hover:-translate-y-1 flex items-center gap-2.5 cursor-pointer outline-none ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.4)] text-white font-medium'
                        : 'border-slate-700/80 hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-500/15 bg-slate-800/60 hover:bg-slate-800/90 text-slate-200'
                    }`}
                  >
                    {/* Option Badge */}
                    <div
                      className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg font-extrabold text-[11px] sm:text-xs flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 shadow-sm'
                          : 'bg-white/10 text-amber-200 border border-white/10'
                      }`}
                    >
                      {letter}
                    </div>

                    {/* Option Text */}
                    <span
                      className={`text-xs sm:text-[13px] flex-1 leading-snug ${
                        isCodeLike
                          ? 'font-mono text-amber-200/95 font-semibold tracking-tight'
                          : 'font-medium'
                      }`}
                    >
                      {optionText}
                    </span>

                    {/* Radio Tick */}
                    <div
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400 text-slate-950'
                          : 'border-slate-500/80 bg-white/5'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action Bar - Sticky with z-50 */}
      <footer className="sticky bottom-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-white/10 py-2 sm:py-2.5 px-4 shrink-0">
        <div className="max-w-lg sm:max-w-xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-3.5 sm:px-4 py-1.5 rounded-xl border border-white/20 font-semibold text-xs sm:text-sm text-blue-200 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs text-blue-200/90 font-medium font-mono">
            {currentIndex + 1} / {totalQuestions}
          </span>

          {currentIndex === totalQuestions - 1 ? (
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="px-4 sm:px-5 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 hover:from-emerald-300 hover:to-amber-200 active:scale-98 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer btn-hover-sweep"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Exam</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 sm:px-5 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-200 hover:from-amber-300 hover:to-yellow-100 active:scale-98 shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer btn-hover-sweep"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>

      {/* 10-Second Full Screen Violation Blocking Modal */}
      {isWarningActive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 overflow-y-auto select-none-strict"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-500 rounded-3xl p-6 sm:p-7 text-center shadow-2xl shadow-red-950/80 animate-shake my-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-500 mb-3 border border-red-500/30 animate-pulse">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
              {violationReason === 'resize'
                ? 'Browser Window Resized'
                : violationReason === 'tab'
                ? 'Tab Switched / Hidden'
                : 'Full Screen Mode Exited'}
            </h3>

            <p className="text-red-200 text-xs sm:text-sm mb-5 leading-relaxed">
              {violationReason === 'resize'
                ? 'Resizing the browser window is not permitted during the exam. Restore full screen within '
                : violationReason === 'tab'
                ? 'Switching tabs or minimizing the window is not permitted. Return to full screen within '
                : 'You left full screen mode. Return to full screen within '}
              <strong className="text-white underline">10 seconds</strong> or your progress will be wiped and your attempt consumed.
            </p>

            {/* 10-Second Countdown Badge */}
            <div className="w-20 h-20 mx-auto mb-5 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-950/50 animate-[countdownPulse_1s_infinite]">
              <span className="text-4xl font-black text-red-400 tabular-nums">
                {countdown}
              </span>
            </div>

            <button
              type="button"
              onClick={handleReturnToFullscreen}
              disabled={isRetryingFullscreen}
              className="w-full py-3 px-6 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition-all shadow-xl shadow-red-600/40 flex items-center justify-center gap-2.5 cursor-pointer btn-hover-sweep"
            >
              <Maximize2 className="h-5 w-5" />
              <span>{isRetryingFullscreen ? 'Restoring Full Screen...' : 'Return to full screen'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quit / Surrender Confirmation Dialog */}
      {showQuitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setShowQuitConfirm(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl text-left my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Quit &amp; Surrender Exam?</h3>
                <p className="text-xs text-rose-200/80">
                  Candidate: {studentName}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1.5 leading-relaxed">
              <p className="font-bold text-rose-300">Warning: This ends your attempt immediately.</p>
              <p className="text-rose-200/80">
                Surrendering will consume 1 of your 2 allowed attempts and discard all selected answers for this session.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowQuitConfirm(false)}
                className="px-4 py-2 rounded-xl border border-white/20 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Continue Exam
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuitConfirm(false);
                  onQuitSurrender();
                }}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-md cursor-pointer transition"
              >
                Yes, Quit &amp; Surrender
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      {showSubmitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setShowSubmitConfirm(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-left my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Submit Examination?</h3>
                <p className="text-xs text-blue-200/70">
                  Candidate: {studentName} &bull; Attempt {attemptNumber} of 2
                </p>
              </div>
            </div>

            {unansweredCount > 0 ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                <p className="font-bold text-amber-300">
                  Notice: {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}.
                </p>
                <p className="text-amber-200/80">
                  Unanswered questions count as wrong. Are you ready to submit your exam to your instructor?
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs">
                <p className="font-bold text-emerald-300">All questions answered!</p>
                <p className="text-emerald-200/80 mt-0.5">
                  Your final score will be graded and sent directly to your instructor.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl border border-white/20 text-xs font-semibold text-blue-200 hover:text-white cursor-pointer"
              >
                Back to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? 'Sending...' : 'Confirm & Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
