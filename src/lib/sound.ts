type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;
let enabled = true;

function getContext(): AudioContext | null {
  if (!enabled) return null;
  if (!context) {
    const Ctor: AudioContextCtor | undefined = window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

export function isSoundEnabled() {
  return enabled;
}

function noiseBurst(ctx: AudioContext, when: number, duration: number, gain: number, frequency: number) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = 1.4;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(gain, when);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(filter).connect(envelope).connect(ctx.destination);
  source.start(when);
  source.stop(when + duration + 0.02);
}

function tone(ctx: AudioContext, when: number, frequency: number, duration: number, gain: number, type: OscillatorType = 'triangle', endFrequency?: number) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(gain, when + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(envelope).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

export function playDiceRoll() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (let i = 0; i < 12; i++) {
    noiseBurst(ctx, now + i * 0.065 + Math.random() * 0.03, 0.05, 0.55, 1800 + Math.random() * 2400);
  }
  noiseBurst(ctx, now + 0.8, 0.18, 0.7, 500);
}

export function playMoveStep() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, ctx.currentTime, 620, 0.09, 0.12);
}

export function playCut() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, ctx.currentTime, 520, 0.35, 0.2, 'sawtooth', 120);
}

export function playWin() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  [523, 659, 784, 1047].forEach((frequency, i) => tone(ctx, now + i * 0.14, frequency, 0.35, 0.18, 'triangle'));
}
