import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,flips,legalMoves,play,score} from '../lib/game.ts';

test('standard opening and first move flip exactly the enclosed stone',()=>{
 const g=initialGame(); assert.deepEqual(score(g.board),{black:2,white:2});
 assert.deepEqual(legalMoves(g.board,1),[19,26,37,44]);
 const n=play(g,19);assert.deepEqual(score(n.board),{black:4,white:1});assert.equal(n.turn,2);assert.deepEqual(n.changed,[27]);assert.equal(g.board[19],0);
 assert.strictEqual(play(g,0),g);assert.strictEqual(play(g,27),g);
});
test('all eight directions flip simultaneously',()=>{
 const board=Array(64).fill(0), expected=[];
 for(const dr of [-1,0,1])for(const dc of [-1,0,1]){if(!dr&&!dc)continue;board[(3+dr)*8+3+dc]=2;expected.push((3+dr)*8+3+dc);board[(3+dr*2)*8+3+dc*2]=1;}
 assert.deepEqual(flips(board,27,1).sort((a,b)=>a-b),expected.sort((a,b)=>a-b));
});
test('long horizontal and diagonal lines work; gaps, edges, own stones and row wrapping do not',()=>{
 let b=Array(64).fill(0);b[0]=1;for(let i=1;i<=6;i++)b[i]=2;assert.equal(flips(b,7,1).length,6);
 b=Array(64).fill(0);b[0]=1;for(let i=1;i<7;i++)b[i*9]=2;assert.equal(flips(b,63,1).length,6);b[27]=0;assert.deepEqual(flips(b,63,1),[]);
 b=Array(64).fill(0);b[6]=1;b[7]=2;assert.deepEqual(flips(b,8,1),[]);
 b=Array(64).fill(0);b[1]=2;b[2]=2;assert.deepEqual(flips(b,0,1),[]);
 b[1]=1;b[2]=2;b[3]=1;assert.deepEqual(flips(b,0,1),[]);
 for(const i of [-1,64,1.5,NaN])assert.deepEqual(flips(b,i,1),[]);
});
test('automatic pass, terminal state with empty squares, full board, and draw',()=>{
 let g={...initialGame(),board:Array(64).fill(1)};g.board[0]=0;g.board[1]=2;g.board[63]=0;g.board[62]=2;
 let n=play(g,0);assert.equal(n.passed,2);assert.equal(n.turn,1);assert.equal(n.over,false);
 n=play(n,63);assert.equal(n.over,true);assert.deepEqual(score(n.board),{black:64,white:0});assert.strictEqual(play(n,1),n);
 g={...initialGame(),board:Array(64).fill(1)};g.board[0]=0;g.board[1]=2;g.board[63]=0;n=play(g,0);assert.equal(n.over,true);assert.equal(n.board[63],0);
 g={...initialGame(),board:Array(64).fill(2)};g.board[0]=0;g.board[2]=1;for(let i=8;i<=36;i++)g.board[i]=1;
 n=play(g,0);assert.equal(n.over,true);assert.deepEqual(score(n.board),{black:32,white:32});
});
// Independent line-scanning oracle and reproducible whole-game simulations.
function oracle(board,index,p){
 if(board[index]!==0)return [];
 const row=Math.floor(index/8),col=index%8,result=[];
 for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]]){
  const ray=[];for(let step=1;step<8;step++){const r=row+step*dr,c=col+step*dc;if(r<0||r>7||c<0||c>7)break;ray.push(r*8+c);}
  const stop=ray.findIndex(i=>board[i]!==3-p);
  if(stop>0&&board[ray[stop]]===p)result.push(...ray.slice(0,stop));
 }
 return result.sort((a,b)=>a-b);
}
test('100 complete games agree with independent rules and finish within 60 moves',()=>{
 let seed=927;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
 for(let trial=0;trial<100;trial++){
  let g=initialGame();
  while(!g.over){
   for(let p=1;p<=2;p++)for(let i=0;i<64;i++)assert.deepEqual(flips(g.board,i,p).sort((a,b)=>a-b),oracle(g.board,i,p));
   const moves=legalMoves(g.board,g.turn);assert.ok(moves.length);const index=moves[Math.floor(random()*moves.length)],before=g;
   g=play(g,index);assert.equal(g.board.filter(Boolean).length,before.board.filter(Boolean).length+1);assert.ok(g.move<=60);
  }
  assert.equal(legalMoves(g.board,1).length,0);assert.equal(legalMoves(g.board,2).length,0);
 }
});
