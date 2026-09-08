'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { RotateCcw, ArrowRight, UsersRound } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { initialGame, legalMoves, name, play, score } from '@/lib/game';

export default function Home() {
  const [game, setGame] = useState(initialGame);
  const [resetOpen, setResetOpen] = useState(false);
  const gameRef = useRef(game);
  gameRef.current = game;
  useEffect(() => {
    type Tool = { name: string; description: string; inputSchema: object; annotations: {readOnlyHint:boolean}; execute: (input: unknown) => unknown };
    const context = (document as Document & {modelContext?: {registerTool: (tool: Tool, options: {signal: AbortSignal}) => void | Promise<void>}}).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const read = () => {const g = gameRef.current; return {board:g.board, turn:name(g.turn), legalMoves:g.over ? [] : legalMoves(g.board,g.turn).map(i => `${'ABCDEFGH'[i%8]}${Math.floor(i/8)+1}`), score:score(g.board), over:g.over};};
    const toolList: Tool[] = [
      {name:'read_othello_game',description:'Read the current board, turn, score and legal moves.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:read},
      {name:'place_othello_disc',description:'Place the current player’s disc at a legal square such as D3; flips discs and advances the turn.',inputSchema:{type:'object',properties:{square:{type:'string',pattern:'^[A-H][1-8]$'}},required:['square'],additionalProperties:false},annotations:{readOnlyHint:false},execute:(input) => {
        const square = (input as {square?:unknown})?.square;
        if (typeof square !== 'string' || !/^[A-H][1-8]$/.test(square)) throw new Error('Square must be A1 through H8.');
        const index = (Number(square[1])-1)*8 + square.charCodeAt(0)-65;
        const current = gameRef.current, next = play(current,index);
        if (next === current) throw new Error('This move is not legal.');
        flushSync(() => setGame(next));
        return read();
      }},
    ];
    for (const tool of toolList) {
      try {void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(() => {});} catch { /* Optional API; ordinary play remains available. */ }
    }
    return () => lifecycle.abort();
  }, []);
  const moves = game.over ? [] : legalMoves(game.board, game.turn);
  const counts = score(game.board);
  const result = counts.black === counts.white ? '引き分け！' : `${counts.black > counts.white ? '黒' : '白'}の勝ち！`;
  return <main className="game-shell">
    <header className="topbar"><h1>ふたりのオセロ<span className="title-dot" /></h1><span className="players"><UsersRound size={17} aria-hidden="true" /> 2人で対戦</span></header>
    <div className="game-layout">
      <section className="board-section" aria-label="オセロの盤面">
        <div className="board-heading"><span>OTHELLO</span><span>{game.move === 0 ? '黒からスタート' : `${game.move} 手目`}</span></div>
        <div className="board-frame">
          <div className="column-labels" aria-hidden="true">{'ABCDEFGH'.split('').map(c => <span key={c}>{c}</span>)}</div>
          <div className="board-with-rows"><div className="row-labels" aria-hidden="true">{Array.from({length:8}, (_,i)=><span key={i}>{i+1}</span>)}</div>
          <div className="board" role="group" aria-label="8行8列の盤面。目印のあるマスに置けます">
            {game.board.map((cell, i) => <button key={i} type="button" className={`square ${moves.includes(i) ? 'legal' : ''}`} disabled={!moves.includes(i)} onClick={() => setGame(g => play(g, i))} aria-label={`${'ABCDEFGH'[i%8]}${Math.floor(i/8)+1}、${cell ? name(cell) + 'の石' : moves.includes(i) ? name(game.turn) + 'を置けます' : '空きマス'}`}>
              {cell ? <span key={`${i}-${cell}-${game.changed.includes(i) ? game.move : 'still'}`} className={`disc ${cell === 1 ? 'black' : 'white'} ${game.changed.includes(i) ? 'flipped' : ''} ${game.last === i ? 'last' : ''}`} aria-hidden="true" /> : moves.includes(i) ? <span className="move-hint" aria-hidden="true" /> : null}
            </button>)}
          </div></div>
        </div>
        <p className="legend"><span className="legend-dot" /> 目印のあるマスに置けます<span className="last-legend">小さな点は最後に置いた石</span></p>
      </section>
      <aside className="game-info">
        <div className="turn-panel" role="status" aria-live="polite" aria-atomic="true">
          <p className="eyebrow">{game.over ? '対戦終了' : 'いまの手番'}</p>
          <div className="turn-title">{!game.over && <span className={`disc turn-disc ${game.turn === 1 ? 'black' : 'white'}`} aria-hidden="true" />}<h2>{game.over ? result : `${name(game.turn)}の番です`}</h2>{!game.over && <ArrowRight size={23} className="turn-arrow" aria-hidden="true" />}</div>
          <p className="turn-help">{game.over ? `黒 ${counts.black} 枚・白 ${counts.white} 枚` : game.passed ? `${name(game.passed)}は置けないためパス。${name(game.turn)}が続けて置きます。` : '目印をタップして、石を置こう。'}</p>
        </div>
        <div className="scores" aria-label="石の枚数">
          <div className={`score ${!game.over && game.turn === 1 ? 'active' : ''}`}><div className="score-label"><span className="disc black" aria-hidden="true" />黒<span className="turn-tag">{!game.over && game.turn === 1 ? '手番' : ''}</span></div><p>{counts.black}<span>枚</span></p></div>
          <div className={`score ${!game.over && game.turn === 2 ? 'active' : ''}`}><div className="score-label"><span className="disc white" aria-hidden="true" />白<span className="turn-tag">{!game.over && game.turn === 2 ? '手番' : ''}</span></div><p>{counts.white}<span>枚</span></p></div>
        </div>
        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}><AlertDialogTrigger className="reset-button"><RotateCcw size={18} aria-hidden="true" />最初から遊ぶ</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>最初から遊びますか？</AlertDialogTitle><AlertDialogDescription>いまの対戦を終えて、黒の番から始めます。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>対戦に戻る</AlertDialogCancel><AlertDialogAction onClick={() => {setGame(initialGame());setResetOpen(false);}}>最初から遊ぶ</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <details className="rules"><summary>あそび方</summary><ol><li>黒と白を決めて、黒から交互に置きます。</li><li>自分の石で挟むと、間にある相手の石がひっくり返ります。縦・横・斜めのすべてが対象です。</li><li>置けないときは自動でパスします。</li><li>2人とも置けなくなったら終了。石が多いほうの勝ちです。</li></ol></details>
      </aside>
    </div>
    <footer>ひとつの盤面を、ふたりで。</footer>
  </main>;
}
