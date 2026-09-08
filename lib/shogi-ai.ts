import {
  attacked,
  finishShogiMove,
  inCheck,
  legalShogiMoves,
  nextShogi,
  sameMove,
} from './shogi.ts';
import type { Kind, Piece, Shogi, ShogiMove, Side } from './shogi.ts';
import type { Difficulty } from './ai.ts';
const values: Record<Kind, number> = {
  P: 100,
  L: 300,
  N: 320,
  S: 450,
  G: 550,
  B: 850,
  R: 1000,
  K: 20000,
};
const value = (p: Piece) =>
  values[p.kind] +
  (p.promoted ? (p.kind === 'B' || p.kind === 'R' ? 350 : 450) : 0);
function evaluate(g: Shogi, side: Side): number {
  if (g.result)
    return g.result.winner === null
      ? 0
      : g.result.winner === side
        ? 1000000
        : -1000000;
  let total = 0;
  for (let i = 0; i < 81; i++) {
    const p = g.board[i];
    if (!p) continue;
    const forward = p.side === 1 ? 8 - Math.floor(i / 9) : Math.floor(i / 9),
      center = 4 - Math.abs(4 - (i % 9));
    total +=
      (p.side === side ? 1 : -1) *
      (value(p) + (p.kind === 'K' ? 0 : forward * 3 + center * 2));
  }
  for (const s of [1, 2] as Side[])
    for (const k of Object.keys(g.hands[s]) as Exclude<Kind, 'K'>[])
      total += (s === side ? 1 : -1) * g.hands[s][k] * values[k] * 1.05;
  return total;
}
export function chooseShogiMove(
  game: Shogi,
  difficulty: Difficulty,
  options: {
    random?: () => number;
    maxMs?: number;
    maxDepth?: number;
    maxNodes?: number;
  } = {},
): ShogiMove | null {
  const moves = legalShogiMoves(game);
  if (!moves.length) return null;
  if (difficulty === 'easy')
    return moves[
      Math.min(
        moves.length - 1,
        Math.floor((options.random ?? Math.random)() * moves.length),
      )
    ];
  const side = game.turn,
    start = performance.now();
  const ranked = moves
    .map((move) => {
      const next = nextShogi(game, move),
        p = next.board[move.to]!;
      const unsafe = attacked(next.board, move.to, next.turn)
        ? value(p) * 0.8
        : 0;
      let score = evaluate(next, side) - unsafe;
      if (inCheck(next, next.turn)) {
        score += 40;
        if (!legalShogiMoves(next).length) score = 1000000;
      }
      return { move, next, score };
    })
    .sort((a, b) => b.score - a.score);
  let best = ranked[0].move;
  if (
    difficulty === 'normal' ||
    ranked[0].score >= 1000000 ||
    moves.length === 1
  )
    return best;
  const deadline = start + (options.maxMs ?? 600),
    limit = options.maxNodes ?? 12000,
    stop = Symbol('budget');
  let nodes = 0;
  const order = (g: Shogi, m: ShogiMove) =>
    (g.board[m.to] ? value(g.board[m.to]!) * 10 : 0) +
    (m.promote ? 300 : 0) -
    (m.from === null ? values[m.drop] * 0.1 : 0);
  const search = (
    g: Shogi,
    depth: number,
    alpha: number,
    beta: number,
  ): number => {
    if (++nodes > limit || performance.now() > deadline) throw stop;
    if (g.result) return evaluate(g, side);
    const legal = legalShogiMoves(g);
    if (!legal.length)
      return g.turn === side ? -1000000 - depth : 1000000 + depth;
    if (!depth) return evaluate(g, side);
    legal.sort((a, b) => order(g, b) - order(g, a));
    const maximize = g.turn === side;
    let score = maximize ? -Infinity : Infinity;
    for (const m of legal) {
      const v = search(nextShogi(g, m), depth - 1, alpha, beta);
      score = maximize ? Math.max(score, v) : Math.min(score, v);
      if (maximize) alpha = Math.max(alpha, score);
      else beta = Math.min(beta, score);
      if (alpha >= beta) break;
    }
    return score;
  };
  for (let depth = 2; depth <= (options.maxDepth ?? 3); depth++) {
    let chosen = best,
      score = -Infinity,
      alpha = -Infinity;
    try {
      for (const item of [...ranked].sort(
        (a, b) => Number(b.move === best) - Number(a.move === best),
      )) {
        const v = search(item.next, depth - 1, alpha, Infinity);
        if (v > score) {
          score = v;
          chosen = item.move;
        }
        alpha = Math.max(alpha, score);
      }
      best = chosen;
    } catch (e) {
      if (e === stop) break;
      throw e;
    }
  }
  return best;
}
// Shared by worker delivery and tests: stale responses cannot cross games/modes.
export function applyShogiCpu(
  current: Shogi,
  expected: Shogi,
  move: ShogiMove | null,
  enabled: boolean,
): Shogi {
  return enabled &&
    current === expected &&
    current.turn === 2 &&
    !current.result &&
    move &&
    legalShogiMoves(current).some(
      (m) => sameMove(m, move),
    )
    ? finishShogiMove(current, move)
    : current;
}
