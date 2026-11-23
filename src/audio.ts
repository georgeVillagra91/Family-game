// Efectos de sonido sintetizados con WebAudio (sin archivos externos) y vibración.
import { getSettings } from './store';

let ac: AudioContext | null = null;
function ctx() {
  if (!getSettings().sound) return null;
  try {
    if (!ac) ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slide = 0, delay = 0) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.15, hp = 800) {
  const a = ctx();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start();
}

export function vibrate(ms: number | number[]) {
  if (!getSettings().vibrate) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* no soportado */
  }
}

export const sfx = {
  tap: () => tone(660, 0.06, 'triangle', 0.12),
  click: () => tone(520, 0.05, 'square', 0.06),
  pop: () => {
    noise(0.08, 0.2, 1500);
    tone(900, 0.08, 'triangle', 0.1, 400);
  },
  good: () => {
    tone(880, 0.08, 'triangle', 0.14);
    tone(1320, 0.1, 'triangle', 0.12, 0, 0.06);
  },
  coin: () => {
    tone(988, 0.07, 'square', 0.07);
    tone(1319, 0.16, 'square', 0.07, 0, 0.07);
  },
  bad: () => {
    tone(220, 0.25, 'sawtooth', 0.1, -120);
    vibrate(120);
  },
  beep: () => tone(600, 0.12, 'sine', 0.16),
  go: () => tone(1100, 0.3, 'sine', 0.18),
  note: (i: number) => tone([392, 494, 587, 698][i % 4], 0.32, 'triangle', 0.2),
  whoosh: () => noise(0.25, 0.08, 400),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, 0, i * 0.11));
    tone(1319, 0.5, 'triangle', 0.14, 0, 0.48);
  },
  fanfare: () => {
    const seq = [523, 523, 523, 659, 784, 659, 784, 1047];
    seq.forEach((f, i) => tone(f, 0.18, 'square', 0.06, 0, i * 0.12));
    seq.forEach((f, i) => tone(f / 2, 0.18, 'triangle', 0.1, 0, i * 0.12));
  }
};

// Desbloquea el audio en iOS con el primer toque.
export function unlockAudio() {
  const a = ctx();
  if (a) tone(1, 0.01, 'sine', 0.0001);
}
