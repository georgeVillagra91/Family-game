// Efectos de sonido sintetizados con WebAudio (sin archivos externos) y vibración.
import { getSettings } from './store';

let ac: AudioContext | null = null;
let out: AudioNode | null = null;
function ctx() {
  if (!getSettings().sound) return null;
  try {
    if (!ac) {
      ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Cadena suave para todos los sonidos: volumen general, se recortan los agudos y un compresor que evita picos.
      const master = ac.createGain();
      master.gain.value = 0.85;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 4200;
      lp.Q.value = 0.5;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 18;
      comp.ratio.value = 4;
      master.connect(lp).connect(comp).connect(ac.destination);
      out = master;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.14, slide = 0, delay = 0, attack = 0.012) {
  const a = ctx();
  if (!a || !out) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.03);
}

/** Ruido filtrado con subida y bajada suaves (soplido, roce). */
function noise(dur: number, vol = 0.05, freq = 900, q = 0.8, delay = 0, type: BiquadFilterType = 'bandpass') {
  const a = ctx();
  if (!a || !out) return;
  const t = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t);
  s.stop(t + dur + 0.02);
}

/** Golpecito de madera, corto y grave (dado, fichas). */
function knock(freq: number, vol: number, delay = 0) {
  tone(freq, 0.07, 'sine', vol, -freq * 0.35, delay, 0.004);
  tone(freq * 2.7, 0.03, 'sine', vol * 0.25, 0, delay, 0.003);
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
  tap: () => tone(620, 0.08, 'sine', 0.1),
  click: () => knock(520, 0.08),
  pop: () => {
    noise(0.07, 0.05, 1400, 1.2);
    tone(700, 0.1, 'sine', 0.1, 300);
  },
  good: () => {
    tone(784, 0.12, 'sine', 0.11);
    tone(1175, 0.16, 'sine', 0.09, 0, 0.07);
  },
  coin: () => {
    tone(1047, 0.12, 'triangle', 0.08);
    tone(1568, 0.22, 'sine', 0.07, 0, 0.08);
  },
  bad: () => {
    tone(330, 0.22, 'triangle', 0.09, -110);
    tone(247, 0.28, 'sine', 0.07, -60, 0.1);
    vibrate(80);
  },
  beep: () => tone(600, 0.14, 'sine', 0.12),
  go: () => {
    tone(880, 0.3, 'sine', 0.13);
    tone(1320, 0.3, 'sine', 0.06, 0, 0.02);
  },
  note: (i: number) => tone([392, 494, 587, 698][i % 4], 0.36, 'triangle', 0.15, 0, 0, 0.02),
  /** Soplido suave (tirar, lanzar, dar vuelta). */
  whoosh: () => noise(0.32, 0.045, 700, 0.6),
  /** Dado rodando: varios golpecitos suaves que se van espaciando. */
  dice: () => {
    let t = 0;
    for (let i = 0; i < 6; i++) {
      knock(380 + Math.random() * 160, 0.07 - i * 0.008, t);
      t += 0.05 + i * 0.025;
    }
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'triangle', 0.11, 0, i * 0.11));
    tone(1319, 0.6, 'sine', 0.1, 0, 0.48);
  },
  fanfare: () => {
    const seq = [523, 523, 523, 659, 784, 659, 784, 1047];
    seq.forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, 0, i * 0.12));
    seq.forEach((f, i) => tone(f / 2, 0.22, 'sine', 0.08, 0, i * 0.12));
  }
};

// Desbloquea el audio en iOS con el primer toque.
export function unlockAudio() {
  const a = ctx();
  if (a) tone(1, 0.01, 'sine', 0.0001);
}
