export type Player = 1 | 2;
export type Cell = 0 | Player;
export type Game = { board: Cell[]; turn: Player; over: boolean; passed: Player | null; last: number | null; changed: number[]; move: number };
export const name = (p: Player) => p === 1 ? '黒' : '白';
export function initialGame(): Game {
  const board: Cell[] = Array(64).fill(0);
  board[27] = board[36] = 2; board[28] = board[35] = 1;
  return { board, turn: 1, over: false, passed: null, last: null, changed: [], move: 0 };
}
export function flips(board: Cell[], index: number, player: Player): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= 64 || board[index] !== 0) return [];
  const all: number[] = [], opponent = 3 - player;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    let r = Math.floor(index / 8) + dr, c = index % 8 + dc;
    const line: number[] = [];
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === opponent) {
      line.push(r * 8 + c); r += dr; c += dc;
    }
    if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === player) all.push(...line);
  }
  return all;
}
export function legalMoves(board: Cell[], player: Player) {
  return board.flatMap((_, i) => flips(board, i, player).length ? [i] : []);
}
export function score(board: Cell[]) {
  return { black: board.filter(v => v === 1).length, white: board.filter(v => v === 2).length };
}
export function play(game: Game, index: number): Game {
  if (game.over) return game;
  const changed = flips(game.board, index, game.turn);
  if (!changed.length) return game;
  const board = [...game.board];
  for (const i of [index, ...changed]) board[i] = game.turn;
  const next = (3 - game.turn) as Player;
  const nextCanPlay = legalMoves(board, next).length > 0;
  const over = !nextCanPlay && legalMoves(board, game.turn).length === 0;
  return { board, turn: nextCanPlay ? next : game.turn, over, passed: !nextCanPlay && !over ? next : null, last: index, changed, move: game.move + 1 };
}
