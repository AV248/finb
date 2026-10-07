/** Tiny WebAudio juice layer — synthesised blips, no asset downloads. */

let context: AudioContext | null = null;
let enabled = true;

export function setAudioEnabled(value: boolean) {
  enabled = value;
}

function ctx(): AudioContext | null {
  if (typeof window === 'undefined' || !enabled) return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

interface ToneOptions {
  freq?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  slide?: number;
}

export function tone({ freq = 440, dur = 0.12, type = 'triangle', gain = 0.05, slide = 0 }: ToneOptions = {}) {
  const audio = ctx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq + slide), audio.currentTime + dur);
  amp.gain.setValueAtTime(0.0001, audio.currentTime);
  amp.gain.exponentialRampToValueAtTime(gain, audio.currentTime + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
  osc.connect(amp).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + dur + 0.02);
}

export const sfx = {
  tap: () => tone({ freq: 620, dur: 0.07, gain: 0.035 }),
  good: () => {
    tone({ freq: 560, dur: 0.09, gain: 0.05 });
    setTimeout(() => tone({ freq: 840, dur: 0.14, gain: 0.045 }), 70);
  },
  perfect: () => {
    tone({ freq: 720, dur: 0.08, gain: 0.055 });
    setTimeout(() => tone({ freq: 1080, dur: 0.1, gain: 0.05 }), 60);
    setTimeout(() => tone({ freq: 1440, dur: 0.16, gain: 0.04, type: 'sine' }), 140);
  },
  bad: () => tone({ freq: 190, dur: 0.22, gain: 0.05, type: 'sawtooth', slide: -60 }),
  boom: () => {
    tone({ freq: 120, dur: 0.4, gain: 0.09, type: 'square', slide: -70 });
    tone({ freq: 70, dur: 0.5, gain: 0.06, type: 'sine', slide: -30 });
  },
  coin: () => {
    tone({ freq: 980, dur: 0.07, gain: 0.04, type: 'square' });
    setTimeout(() => tone({ freq: 1420, dur: 0.09, gain: 0.03, type: 'square' }), 50);
  },
  reward: () => {
    [523, 659, 784, 1046].forEach((freq, index) => setTimeout(() => tone({ freq, dur: 0.16, gain: 0.045, type: 'sine' }), index * 90));
  },
  teleport: () => {
    tone({ freq: 240, dur: 0.5, gain: 0.05, type: 'sawtooth', slide: 900 });
    setTimeout(() => tone({ freq: 1400, dur: 0.3, gain: 0.03, type: 'sine', slide: -600 }), 120);
  },
};
