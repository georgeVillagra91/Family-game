// Persistencia local: perfiles, historial y preferencias (localStorage).
import type { AvatarSpec } from './avatar';
import { randomAvatar } from './avatar';

export type Level = 1 | 2 | 3; // 1 = chico (~8 años), 2 = grande (~10 años), 3 = adulto
export const LEVEL_NAMES: Record<Level, string> = { 1: 'Chico (hasta 8)', 2: 'Grande (9 a 12)', 3: 'Adulto' };

export interface Profile {
  id: string;
  name: string;
  avatar: AvatarSpec;
  level: Level;
  guest?: boolean;
  remote?: boolean; // llegó por internet desde otro celu
}

export interface RoundRecord {
  game: string;
  scores: Record<string, number>; // por jugador
  winnerSides: number[];
}

export interface MatchRecord {
  id: string;
  date: number;
  online: boolean;
  mode: Mode;
  players: Profile[];
  sides: string[][];
  rounds: RoundRecord[];
  stars: number[]; // por lado
  winnerSides: number[];
}

export type Mode = '1v1' | '2v2' | 'todos';

const K_PROFILES = 'rv.profiles';
const K_HISTORY = 'rv.history';
const K_SETTINGS = 'rv.settings';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento lleno o bloqueado: seguimos sin guardar */
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function defaultProfiles(): Profile[] {
  return [
    { id: uid(), name: 'Sofi', level: 3, avatar: { skin: 1, hair: 8, hairColor: 2, eyes: 5, mouth: 5, acc: 9, bg: 7, shirt: 0, beard: 0 } },
    { id: uid(), name: 'George', level: 3, avatar: { skin: 2, hair: 12, hairColor: 0, eyes: 0, mouth: 1, acc: 0, bg: 0, shirt: 2, beard: 2 } },
    { id: uid(), name: 'Cande', level: 2, avatar: { skin: 1, hair: 9, hairColor: 1, eyes: 4, mouth: 0, acc: 3, bg: 6, shirt: 6, beard: 0 } },
    { id: uid(), name: 'Guille', level: 1, avatar: { skin: 1, hair: 11, hairColor: 2, eyes: 1, mouth: 2, acc: 5, bg: 3, shirt: 3, beard: 0 } }
  ];
}

export interface Settings {
  sound: boolean;
  vibrate: boolean;
  me?: string; // id del perfil "dueño" de este celu (para jugar online)
}

type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = () => listeners.forEach((l) => l());

let profiles: Profile[] = load<Profile[] | null>(K_PROFILES, null) ?? defaultProfiles();
let history: MatchRecord[] = load<MatchRecord[]>(K_HISTORY, []);
let settings: Settings = load<Settings>(K_SETTINGS, { sound: true, vibrate: true });
save(K_PROFILES, profiles);

export const getProfiles = () => profiles;
export const getProfile = (id: string) => profiles.find((p) => p.id === id);
export const getHistory = () => history;
export const getSettings = () => settings;

export function upsertProfile(p: Profile) {
  const i = profiles.findIndex((x) => x.id === p.id);
  profiles = i >= 0 ? profiles.map((x) => (x.id === p.id ? p : x)) : [...profiles, p];
  save(K_PROFILES, profiles);
  emit();
}
export function deleteProfile(id: string) {
  profiles = profiles.filter((p) => p.id !== id);
  save(K_PROFILES, profiles);
  emit();
}
export function newGuest(): Profile {
  const n = profiles.filter((p) => p.guest).length + 1;
  return { id: uid(), name: `Invitado ${n}`, level: 3, guest: true, avatar: randomAvatar() };
}
export function setSettings(s: Partial<Settings>) {
  settings = { ...settings, ...s };
  save(K_SETTINGS, settings);
  emit();
}
export function addMatch(m: MatchRecord) {
  if (history.some((h) => h.id === m.id)) return;
  history = [m, ...history].slice(0, 500);
  save(K_HISTORY, history);
  emit();
}
export function clearHistory() {
  history = [];
  save(K_HISTORY, history);
  emit();
}

// ---------- Estadísticas ----------
export interface PlayerStats {
  id: string;
  name: string;
  avatar: AvatarSpec;
  played: number;
  wins: number;
  stars: number;
  roundsWon: number;
}

export function computeStats(): PlayerStats[] {
  const map = new Map<string, PlayerStats>();
  for (const m of history) {
    m.sides.forEach((side, si) => {
      for (const pid of side) {
        const p = m.players.find((x) => x.id === pid);
        if (!p) continue;
        const local = getProfile(pid);
        // Se agrupa por nombre: el mismo familiar tiene distinto id en cada celu.
        const key = (local?.name ?? p.name).trim().toLowerCase();
        const s = map.get(key) ?? { id: pid, name: local?.name ?? p.name, avatar: local?.avatar ?? p.avatar, played: 0, wins: 0, stars: 0, roundsWon: 0 };
        s.played++;
        if (m.winnerSides.includes(si)) s.wins++;
        s.stars += m.stars[si] ?? 0;
        s.roundsWon += m.rounds.filter((r) => r.winnerSides.includes(si)).length;
        map.set(key, s);
      }
    });
  }
  return [...map.values()].sort((a, b) => b.wins - a.wins || b.roundsWon - a.roundsWon || b.stars - a.stars || a.played - b.played);
}

export interface GameRecord {
  game: string;
  score: number;
  name: string;
  avatar: AvatarSpec;
  date: number;
}
export function computeRecords(): Record<string, GameRecord> {
  const rec: Record<string, GameRecord> = {};
  for (const m of history) {
    for (const r of m.rounds) {
      for (const [pid, score] of Object.entries(r.scores)) {
        if (!rec[r.game] || score > rec[r.game].score) {
          const p = m.players.find((x) => x.id === pid);
          if (p) rec[r.game] = { game: r.game, score, name: getProfile(pid)?.name ?? p.name, avatar: getProfile(pid)?.avatar ?? p.avatar, date: m.date };
        }
      }
    }
  }
  return rec;
}
export function personalBest(pid: string, game: string): number {
  let best = 0;
  for (const m of history) for (const r of m.rounds) if (r.game === game && (r.scores[pid] ?? 0) > best) best = r.scores[pid];
  return best;
}
