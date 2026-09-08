import { legalMoves, play, score } from './game.ts';
import type { Game, Player } from './game.ts';

export type Difficulty = 'easy' | 'normal' | 'hard';
export const difficultyNames: Record<Difficulty, string> = { easy: '弱い', normal: '普通', hard: '強い' };
const weights = [
  120,-30,20,5,5,20,-30,120,
  -30,-50,-5,-5,-5,-5,-50,-30,
  20,-5,15,3,3,15,-5,20,
  5,-5,3,3,3,3,-5,5,
  5,-5,3,3,3,3,-5,5,
  20,-5,15,3,3,15,-5,20,
  -30,-50,-5,-5,-5,-5,-50,-30,
  120,-30,20,5,5,20,-30,120,
];
function evaluate(game: Game, player: Player): number {
  const { black, white } = score(game.board);
  const difference = player === 1 ? black - white : white - black;
  if (game.over) return Math.sign(difference) * 100000 + difference * 100;
  const opponent = (3 - player) as Player;
  const empty = 64 - black - white;
  let positional = 0, frontier = 0;
  for (let i = 0; i < 64; i++) {
    const cell = game.board[i];
    if (!cell) continue;
    const sign = cell === player ? 1 : -1;
    let weight = weights[i];
    // Once a corner is occupied, adjacent squares are no longer a corner trap.
    for (const corner of [0,7,56,63]) {
      if (game.board[corner] && Math.abs(Math.floor(i/8)-Math.floor(corner/8))<=1 && Math.abs(i%8-corner%8)<=1 && i!==corner) weight=10;
    }
    positional += sign * weight;
    const r=Math.floor(i/8), c=i%8;
    if ([-1,0,1].some(dr => [-1,0,1].some(dc => (dr||dc) && r+dr>=0 && r+dr<8 && c+dc>=0 && c+dc<8 && game.board[(r+dr)*8+c+dc]===0))) frontier -= sign;
  }
  const mobility = legalMoves(game.board,player).length-legalMoves(game.board,opponent).length;
  return positional + mobility * 9 + frontier * 3 + difference * (empty < 16 ? 5 : 0.3);
}
export type SearchOptions = { random?: () => number; maxMs?: number; maxDepth?: number; maxNodes?: number };
export function chooseMove(game: Game, difficulty: Difficulty, options: SearchOptions = {}): number | null {
  const moves = game.over ? [] : legalMoves(game.board,game.turn);
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.min(moves.length-1,Math.max(0,Math.floor((options.random ?? Math.random)()*moves.length)))];
  const player=game.turn;
  const ranked=moves.map(move => ({move,game:play(game,move)})).map(item=>({...item,value:evaluate(item.game,player)})).sort((a,b)=>b.value-a.value);
  let best=ranked[0].move;
  if (difficulty === 'normal' || moves.length === 1) return best;
  const deadline=performance.now()+(options.maxMs ?? 350);
  const maxNodes=options.maxNodes ?? 40000;
  let nodes=0;
  const stop=Symbol('search budget');
  function search(position: Game, depth: number, alpha: number, beta: number): number {
    if (++nodes>maxNodes || performance.now()>deadline) throw stop;
    if (!depth || position.over) return evaluate(position,player);
    // play() handles passes, so consecutive turns by the same color keep their
    // maximizing/minimizing role rather than incorrectly switching signs.
    const maximizing=position.turn===player;
    const candidates=legalMoves(position.board,position.turn).sort((a,b)=>weights[b]-weights[a]);
    let value=maximizing ? -Infinity : Infinity;
    for (const move of candidates) {
      const v=search(play(position,move),depth-1,alpha,beta);
      value=maximizing ? Math.max(value,v) : Math.min(value,v);
      if (maximizing) alpha=Math.max(alpha,value); else beta=Math.min(beta,value);
      if (alpha>=beta) break;
    }
    return value;
  }
  const empty=game.board.filter(v=>!v).length;
  const maxDepth=options.maxDepth ?? (empty<=10 ? empty : 5);
  for (let depth=2;depth<=maxDepth;depth++) {
    let iterationBest=best,value=-Infinity,alpha=-Infinity;
    try {
      const ordered=[...ranked].sort((a,b)=>Number(b.move===best)-Number(a.move===best));
      for (const item of ordered) {
        const v=search(item.game,depth-1,alpha,Infinity);
        if (v>value) {value=v;iterationBest=item.move;}
        alpha=Math.max(alpha,value);
      }
      best=iterationBest;
    } catch (error) {if (error===stop) break;throw error;}
  }
  return best;
}
