import { OptionLetter } from '../types';

/**
 * Self-contained Web Audio API engine for:
 * 1. Crisp, pleasant tactile click sounds when selecting answer options (A, B, C, D)
 * 2. Subtle navigation clicks & exam submission chime
 * 3. Soothing ambient lo-fi / warm electric-piano background music
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

let isMuted = false;
let isMusicPlaying = false;
let musicLoopTimer: ReturnType<typeof setInterval> | null = null;
let noteTimeouts: ReturnType<typeof setTimeout>[] = [];
let activePadNodes: AudioNode[] = [];
let chordStep = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    audioCtx = new AudioCtx();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = isMuted ? 0 : 1;
    masterGain.connect(audioCtx.destination);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.22; // Soft, soothing background level
    musicGain.connect(masterGain);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.45; // Crisp, clear button feedback
    sfxGain.connect(masterGain);
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Call during a user gesture (e.g., clicking "Start Exam") to ensure audio is unlocked.
 */
export function unlockAudio(): void {
  getAudioContext();
}

/**
 * Mute / Unmute all exam sounds and background music smoothly.
 */
export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
  if (audioCtx && masterGain) {
    masterGain.gain.setTargetAtTime(muted ? 0 : 1, audioCtx.currentTime, 0.08);
  }
}

export function getAudioMuted(): boolean {
  return isMuted;
}

/**
 * Pleasant tactile glass-marimba chime when clicking an answer button (A, B, C, D).
 * Uses neutral pentatonic pitches (C5, D5, E5, G5) so every option sounds equally pleasant.
 */
export function playOptionSelectSound(option: OptionLetter): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !sfxGain) return;

  const now = ctx.currentTime;
  const pitchMap: Record<OptionLetter, number> = {
    A: 523.25, // C5
    B: 587.33, // D5
    C: 659.25, // E5
    D: 783.99, // G5
  };
  const baseFreq = pitchMap[option] || 523.25;

  // 1. Primary warm marimba tone
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.008, now + 0.06);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.26);

  // 2. Subtle airy harmonic overtone for crispness
  const shimmerOsc = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmerOsc.type = 'triangle';
  shimmerOsc.frequency.setValueAtTime(baseFreq * 2, now);

  shimmerGain.gain.setValueAtTime(0.001, now);
  shimmerGain.gain.linearRampToValueAtTime(0.08, now + 0.008);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  shimmerOsc.connect(shimmerGain);
  shimmerGain.connect(sfxGain);
  shimmerOsc.start(now);
  shimmerOsc.stop(now + 0.14);
}

/**
 * Subtle soft wooden/digital click for Previous / Next navigation buttons.
 */
export function playNavClickSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !sfxGain) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.09);
}

/**
 * Warm ascending chord chime when submitting the exam.
 */
export function playSubmitSuccessSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx || !sfxGain) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6

  notes.forEach((freq, idx) => {
    const start = now + idx * 0.075;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.65);

    osc.connect(gain);
    gain.connect(sfxGain!);
    osc.start(start);
    osc.stop(start + 0.7);
  });
}

// Peaceful ambient chord progression (Cmaj9 -> Am9 -> Fmaj9 -> G6)
const SOOTHING_CHORDS: { pad: number[]; melody: number[] }[] = [
  {
    // Cmaj9
    pad: [130.81, 196.0, 246.94, 293.66], // C3, G3, B3, D4
    melody: [523.25, 659.25, 783.99, 587.33], // C5, E5, G5, D5
  },
  {
    // Am9
    pad: [110.0, 164.81, 246.94, 261.63], // A2, E3, B3, C4
    melody: [523.25, 659.25, 493.88, 659.25], // C5, E5, B4, E5
  },
  {
    // Fmaj9
    pad: [87.31, 174.61, 220.0, 261.63], // F2, F3, A3, C4
    melody: [440.0, 523.25, 659.25, 587.33], // A4, C5, E5, D5
  },
  {
    // G6sus4 -> G6
    pad: [98.0, 196.0, 246.94, 293.66], // G2, G3, B3, D4
    melody: [493.88, 587.33, 783.99, 659.25], // B4, D5, G5, E5
  },
];

function playAmbientChordBar(ctx: AudioContext, barDurationSec: number): void {
  if (!musicGain) return;

  const chord = SOOTHING_CHORDS[chordStep % SOOTHING_CHORDS.length];
  chordStep += 1;

  const now = ctx.currentTime;

  // Low-pass filter to keep the synth pad warm, silky, and non-fatiguing
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(750, now);
  filter.Q.setValueAtTime(0.7, now);
  filter.connect(musicGain);

  // Play warm pad voices with slow fade-in and fade-out envelope
  chord.pad.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = i === 0 ? 'sine' : 'triangle';
    // Tiny gentle detune for lush ambient width
    osc.frequency.setValueAtTime(freq * (i % 2 === 0 ? 1 : 1.0015), now);

    const peak = i === 0 ? 0.14 : 0.085;
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(peak, now + 1.1);
    noteGain.gain.setValueAtTime(peak, now + barDurationSec - 1.2);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + barDurationSec + 0.2);

    osc.connect(noteGain);
    noteGain.connect(filter);

    osc.start(now);
    osc.stop(now + barDurationSec + 0.25);
    activePadNodes.push(osc);
  });

  // Schedule gentle electric-piano melody notes drifting softly over the bar
  chord.melody.forEach((melFreq, idx) => {
    const delayMs = idx * ((barDurationSec * 1000) / chord.melody.length) + 180;
    const tId = setTimeout(() => {
      if (!isMusicPlaying || !audioCtx || !musicGain) return;
      const t = audioCtx.currentTime;

      const melOsc = audioCtx.createOscillator();
      const melGain = audioCtx.createGain();

      melOsc.type = 'sine';
      melOsc.frequency.setValueAtTime(melFreq, t);

      melGain.gain.setValueAtTime(0.0001, t);
      melGain.gain.linearRampToValueAtTime(0.065, t + 0.08);
      melGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);

      melOsc.connect(melGain);
      melGain.connect(musicGain);

      melOsc.start(t);
      melOsc.stop(t + 2.0);
    }, delayMs);

    noteTimeouts.push(tId);
  });
}

/**
 * Start looping the soothing ambient background music.
 */
export function startSoothingMusic(): void {
  if (isMusicPlaying) return;
  const ctx = getAudioContext();
  if (!ctx || !musicGain) return;

  isMusicPlaying = true;
  chordStep = 0;
  musicGain.gain.setTargetAtTime(0.22, ctx.currentTime, 0.3);

  const barDurationSec = 4.4;
  playAmbientChordBar(ctx, barDurationSec);

  musicLoopTimer = setInterval(() => {
    if (!isMusicPlaying || !audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    playAmbientChordBar(audioCtx, barDurationSec);
  }, barDurationSec * 1000);
}

/**
 * Cleanly fade out and stop the soothing background music.
 */
export function stopSoothingMusic(): void {
  isMusicPlaying = false;

  if (musicLoopTimer) {
    clearInterval(musicLoopTimer);
    musicLoopTimer = null;
  }

  noteTimeouts.forEach((id) => clearTimeout(id));
  noteTimeouts = [];

  if (audioCtx && musicGain) {
    musicGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.15);
  }

  activePadNodes.forEach((node) => {
    try {
      if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
        (node as OscillatorNode).stop(audioCtx ? audioCtx.currentTime + 0.25 : 0);
      }
    } catch {
      // Ignore already-stopped nodes
    }
  });
  activePadNodes = [];
}
