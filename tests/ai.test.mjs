import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,legalMoves,play,score} from '../lib/game.ts';
import {chooseMove} from '../lib/ai.ts';
import {isComputerTurn,humanMove,computerMove} from '../lib/match.ts';
const levels=['easy','normal','hard'];
function generator(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};}

test('each difficulty returns a legal move without changing the game',()=>{
 const random=generator(87);let game=initialGame();
 for(let step=0;step<55&&!game.over;step++){
  const moves=legalMoves(game.board,game.turn),before=structuredClone(game);
  for(const level of levels) assert.ok(moves.includes(chooseMove(game,level,{maxMs:10,maxDepth:3,maxNodes:500,random})));
  assert.deepEqual(game,before);game=play(game,moves[Math.floor(random()*moves.length)]);
 }
 for(const level of levels){assert.equal(chooseMove({...game,over:true},level),null);assert.equal(chooseMove({...game,board:Array(64).fill(1)},level),null);}
});
test('easy uses random choices while normal takes a safe corner',()=>{
 const game={...initialGame(),board:Array(64).fill(0)};
 game.board[1]=2;game.board[2]=1;game.board[27]=2;game.board[28]=1;
 const moves=legalMoves(game.board,1);assert.ok(moves.includes(0)&&moves.length>1);
 assert.equal(chooseMove(game,'easy',{random:()=>0}),moves[0]);
 assert.equal(chooseMove(game,'easy',{random:()=>0.99999}),moves.at(-1));
 assert.equal(chooseMove(game,'normal'),0);
 assert.ok(moves.includes(chooseMove(game,'hard',{maxMs:0,maxNodes:0})));
});
function finalValue(game,player){const s=score(game.board);return player===1?s.black-s.white:s.white-s.black;}
function solve(game,player){
 if(game.over)return finalValue(game,player);
 const values=legalMoves(game.board,game.turn).map(i=>solve(play(game,i),player));
 return game.turn===player?Math.max(...values):Math.min(...values);
}
test('strong search finds optimal outcomes in 12 small endgames, including passes',()=>{
 const random=generator(173);let passSeen=false;
 for(let trial=0;trial<12;trial++){
  let game=initialGame();while(!game.over&&game.board.filter(v=>!v).length>6){const moves=legalMoves(game.board,game.turn);game=play(game,moves[Math.floor(random()*moves.length)]);}
  if(game.over)continue;
  const move=chooseMove(game,'hard',{maxMs:5000,maxDepth:6,maxNodes:1000000});
  assert.equal(solve(play(game,move),game.turn),solve(game,game.turn));
  while(!game.over){if(game.passed)passSeen=true;game=play(game,chooseMove(game,'hard',{maxMs:1000,maxDepth:6}));}
 }
 assert.ok(passSeen,'endgame fixtures exercise consecutive turns after a pass');
});
test('human/computer turn guards, reset races, two-player mode and automatic passes',()=>{
 const start=initialGame(),whiteTurn=play(start,19);
 assert.strictEqual(humanMove(start,'computer',19,true),start);
 assert.equal(humanMove(start,'computer',19).turn,2);
 assert.equal(isComputerTurn(whiteTurn,'computer'),true);
 const move=legalMoves(whiteTurn.board,2)[0];
 assert.strictEqual(humanMove(whiteTurn,'computer',move),whiteTurn);
 assert.notStrictEqual(humanMove(whiteTurn,'two-player',move),whiteTurn);
 assert.strictEqual(computerMove(start,whiteTurn,'computer',move),start);
 assert.strictEqual(computerMove(whiteTurn,whiteTurn,'two-player',move),whiteTurn);
 assert.notStrictEqual(computerMove(whiteTurn,whiteTurn,'computer',move),whiteTurn);
 assert.strictEqual(computerMove(whiteTurn,whiteTurn,'computer',0),whiteTurn);
 const reset=initialGame();assert.strictEqual(computerMove(reset,whiteTurn,'computer',move),reset);
 let game={...initialGame(),turn:2,board:Array(64).fill(2)};game.board[0]=0;game.board[1]=1;game.board[63]=0;game.board[62]=1;
 game=computerMove(game,game,'computer',0);assert.equal(game.passed,1);assert.equal(isComputerTurn(game,'computer'),true);
 game=computerMove(game,game,'computer',63);assert.equal(game.over,true);assert.equal(isComputerTurn(game,'computer'),false);
});
