// Reglas de una "Noche de Juegos": equipos, puntos, ventaja invisible y resultado final.
import type { GameDef } from './engine';
import type { Mode, Profile, RoundRecord } from './store';
import { frutas } from './games/frutas';
import { globos, BALLOON_COLORS } from './games/globos';
import { monos } from './games/monos';
import { duelo } from './games/duelo';
import { panqueques } from './games/panqueques';
import { pares } from './games/pares';

/** Para sumar un juego nuevo: crear su archivo en src/games y agregarlo acá. */
export const GAMES: GameDef[] = [frutas, globos, monos, duelo, panqueques, pares];
export const gameById = (id: string) => GAMES.find((g) => g.id === id)!;

export const SIDE_COLORS = BALLOON_COLORS.map((b) => b.c);
export const SIDE_NAMES = ['Rojo', 'Azul', 'Verde', 'Violeta'];

export interface MatchSetup {
  mode: Mode;
  sides: string[][];
  games: string[];
}

export function sideColor(i: number) {
  return SIDE_COLORS[i % SIDE_COLORS.length];
}

export function sideLabel(sides: string[][], i: number, players: Profile[]) {
  const names = sides[i].map((id) => players.find((p) => p.id === id)?.name ?? '?');
  return names.join(' y ');
}

/** Equipos sugeridos para 2vs2: un adulto con una niña en cada equipo cuando se puede. */
export function suggestTeams(ps: Profile[]): string[][] {
  const shuffled = [...ps].sort(() => Math.random() - 0.5);
  const kids = shuffled.filter((p) => p.level < 3);
  const adults = shuffled.filter((p) => p.level >= 3);
  const a: string[] = [], b: string[] = [];
  const order = [...adults, ...kids];
  // alterna para mezclar
  order.forEach((p, i) => (i % 2 === 0 ? a : b).push(p.id));
  return [a.slice(0, 2), b.slice(0, 2)];
}

/** Elige N juegos al azar sin repetir el mismo tipo dos veces seguidas. */
export function pickGames(n: number): string[] {
  const out: GameDef[] = [];
  let pool = [...GAMES].sort(() => Math.random() - 0.5);
  while (out.length < n) {
    if (pool.length === 0) pool = [...GAMES].sort(() => Math.random() - 0.5);
    const last = out[out.length - 1];
    const idx = pool.findIndex((g) => !last || (g.type !== last.type && g.id !== last.id));
    const g = pool.splice(idx >= 0 ? idx : 0, 1)[0];
    out.push(g);
  }
  return out.map((g) => g.id);
}

export function sideTotals(sides: string[][], scores: Record<string, number>) {
  return sides.map((s) => s.reduce((acc, id) => acc + (scores[id] ?? 0), 0));
}

export function roundWinners(sides: string[][], scores: Record<string, number>): number[] {
  const t = sideTotals(sides, scores);
  const max = Math.max(...t);
  return t.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0);
}

/** Puntos de la noche que reparte una ronda (el último juego vale doble). */
export function roundPoints(sides: string[][], scores: Record<string, number>, roundIdx: number, totalRounds: number): number[] {
  const t = sideTotals(sides, scores);
  const mult = totalRounds >= 3 && roundIdx === totalRounds - 1 ? 2 : 1;
  if (sides.length === 2) {
    if (t[0] === t[1]) return [2 * mult, 2 * mult];
    return t.map((v, i) => (v > t[1 - i] ? 3 : 1) * mult);
  }
  const sorted = [...new Set(t)].sort((a, b) => b - a);
  return t.map((v) => {
    const rank = sorted.indexOf(v);
    return Math.max(0, 3 - rank) * mult;
  });
}

export function nightPoints(sides: string[][], rounds: RoundRecord[], totalRounds: number): number[] {
  const pts = sides.map(() => 0);
  rounds.forEach((r, i) => roundPoints(sides, r.scores, i, totalRounds).forEach((p, si) => (pts[si] += p)));
  return pts;
}

export function finalWinners(points: number[]): number[] {
  const max = Math.max(...points);
  return points.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
}

/**
 * Ventaja invisible (0..1). Base según el nivel de ayuda del perfil
 * y un empujoncito si su lado viene perdiendo la noche por 3 o más puntos.
 */
export function assistFor(p: Profile, sideIdx: number, points: number[]): number {
  const base = p.level === 1 ? 0.75 : p.level === 2 ? 0.4 : 0;
  const max = Math.max(...points, 0);
  const behind = points.length > 1 && max - (points[sideIdx] ?? 0) >= 3 ? 0.15 : 0;
  return Math.max(0, Math.min(1, base + behind));
}

export function sideOf(sides: string[][], pid: string) {
  return sides.findIndex((s) => s.includes(pid));
}

/** Orden de turnos para jugar pasando el celu: alterna los lados. */
export function turnOrder(sides: string[][]): string[] {
  const out: string[] = [];
  const max = Math.max(...sides.map((s) => s.length));
  for (let i = 0; i < max; i++) for (const s of sides) if (s[i]) out.push(s[i]);
  return out;
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31) + 1;
