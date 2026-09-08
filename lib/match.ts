import { play } from './game.ts';
import type { Game } from './game.ts';
export type Mode = 'two-player' | 'computer';
export const isComputerTurn = (game: Game, mode: Mode) => mode === 'computer' && game.turn === 2 && !game.over;
export function humanMove(game: Game, mode: Mode, index: number, paused = false): Game {
  return paused || isComputerTurn(game,mode) ? game : play(game,index);
}
// A delayed worker response must not modify a reset or different game.
export function computerMove(current: Game, expected: Game, mode: Mode, index: number): Game {
  return current === expected && isComputerTurn(current,mode) ? play(current,index) : current;
}
