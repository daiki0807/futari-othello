'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { RotateCcw, ArrowRight, UsersRound, Bot } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { chooseMove, difficultyNames } from '@/lib/ai';
import type { Difficulty } from '@/lib/ai';
import { isComputerTurn, humanMove, computerMove } from '@/lib/match';
import type { Mode } from '@/lib/match';
import { initialGame, legalMoves, name, score } from '@/lib/game';

export default function Home({active=true}:{active?:boolean}) {
  const [game, setGame] = useState(initialGame);
  const [resetOpen, setResetOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('two-player');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [pendingSettings, setPendingSettings] = useState<{mode: Mode; difficulty: Difficulty} | null>(null);
  const settingsRef = useRef({mode,difficulty,paused:resetOpen||!active});
  settingsRef.current = {mode,difficulty,paused:resetOpen||!active};
  const thinking = isComputerTurn(game,mode);
  const changeSettings = (next: {mode: Mode; difficulty: Difficulty}) => {
    if (next.mode === mode && next.difficulty === difficulty) return;
    if (game.move > 0 && !game.over) {setPendingSettings(next);setResetOpen(true);}
    else {setMode(next.mode);setDifficulty(next.difficulty);setGame(initialGame());}
  };
  const closeReset = (open: boolean) => {setResetOpen(open);if (!open) setPendingSettings(null);};
  const restart = () => {
    if (pendingSettings) {setMode(pendingSettings.mode);setDifficulty(pendingSettings.difficulty);}
    setGame(initialGame());setPendingSettings(null);setResetOpen(false);
  };
  useEffect(() => {
    if (!active || !isComputerTurn(game,mode) || resetOpen) return;
    let cancelled=false, worker: Worker | undefined;
    const apply = (index: number | null) => {
      if (!cancelled && index !== null && !settingsRef.current.paused && settingsRef.current.mode === mode && settingsRef.current.difficulty === difficulty) {
        setGame(current => computerMove(current,game,mode,index));
      }
    };
    const fallback = () => {if (!cancelled) apply(chooseMove(game,difficulty,{maxMs:70,maxNodes:5000}));};
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL('../lib/ai-worker.ts',import.meta.url),{type:'module'});
        worker.onmessage = (event: MessageEvent<{move:number|null}>) => {apply(event.data.move);worker?.terminate();};
        worker.onerror = () => {worker?.terminate();fallback();};
        worker.postMessage({game,difficulty});
      } catch {fallback();}
    }, 400);
    return () => {cancelled=true;window.clearTimeout(timer);worker?.terminate();};
  }, [game,mode,difficulty,resetOpen,active]);
  const gameRef = useRef(game);
  gameRef.current = game;
  useEffect(() => {
    if (!active) return;
    type Tool = { name: string; description: string; inputSchema: object; annotations: {readOnlyHint:boolean}; execute: (input: unknown) => unknown };
    const context = (document as Document & {modelContext?: {registerTool: (tool: Tool, options: {signal: AbortSignal}) => void | Promise<void>}}).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const read = () => {const g = gameRef.current; return {mode:settingsRef.current.mode, difficulty:settingsRef.current.difficulty, canPlace:!settingsRef.current.paused&&!isComputerTurn(g,settingsRef.current.mode)&&!g.over, board:g.board, turn:name(g.turn), legalMoves:g.over ? [] : legalMoves(g.board,g.turn).map(i => `${'ABCDEFGH'[i%8]}${Math.floor(i/8)+1}`), score:score(g.board), over:g.over};};
    const toolList: Tool[] = [
      {name:'read_othello_game',description:'Read the current board, turn, score and legal moves.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:read},
      {name:'place_othello_disc',description:'Place the current player’s disc at a legal square such as D3; flips discs and advances the turn.',inputSchema:{type:'object',properties:{square:{type:'string',pattern:'^[A-H][1-8]$'}},required:['square'],additionalProperties:false},annotations:{readOnlyHint:false},execute:(input) => {
        const square = (input as {square?:unknown})?.square;
        if (typeof square !== 'string' || !/^[A-H][1-8]$/.test(square)) throw new Error('Square must be A1 through H8.');
        const index = (Number(square[1])-1)*8 + square.charCodeAt(0)-65;
        const current = gameRef.current, next = humanMove(current,settingsRef.current.mode,index,settingsRef.current.paused);
        if (next === current) throw new Error('This move is not legal.');
        flushSync(() => setGame(next));
        return read();
      }},
    ];
    for (const tool of toolList) {
      try {void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(() => {});} catch { /* Optional API; ordinary play remains available. */ }
    }
    return () => lifecycle.abort();
  }, [active]);
  const moves = game.over || thinking || resetOpen ? [] : legalMoves(game.board, game.turn);
  const counts = score(game.board);
  const result = counts.black === counts.white ? '引き分け！' : `${counts.black > counts.white ? '黒' : '白'}の勝ち！`;
  return <main className="game-shell">
    <header className="topbar"><h1>ふたりのオセロ<span className="title-dot" /></h1><span className="players">{mode === 'computer' ? <Bot size={17} aria-hidden="true" /> : <UsersRound size={17} aria-hidden="true" />}{mode === 'computer' ? 'コンピューター対戦' : '2人で対戦'}</span></header>
    <section className="match-settings" aria-label="対戦設定">
      <div className="setting-field"><p id="mode-label">対戦モード</p><RadioGroup className="mode-options" aria-labelledby="mode-label" value={mode} onValueChange={value => changeSettings({mode:value as Mode,difficulty})}>
        <label className={`setting-option ${mode === 'two-player' ? 'selected' : ''}`}><RadioGroupItem value="two-player" /><UsersRound size={18} aria-hidden="true" />2人で対戦</label>
        <label className={`setting-option ${mode === 'computer' ? 'selected' : ''}`}><RadioGroupItem value="computer" /><Bot size={18} aria-hidden="true" />コンピューターと対戦</label>
      </RadioGroup></div>
      {mode === 'computer' && <div className="setting-field"><p id="difficulty-label">コンピューターの強さ</p><RadioGroup className="difficulty-options" aria-labelledby="difficulty-label" value={difficulty} onValueChange={value => changeSettings({mode,difficulty:value as Difficulty})}>
        {(['easy','normal','hard'] as const).map(level => <label key={level} className={`setting-option ${difficulty === level ? 'selected' : ''}`}><RadioGroupItem value={level} />{difficultyNames[level]}</label>)}
      </RadioGroup><p className="player-assignment">あなたは黒（先手）／コンピューターは白</p></div>}
    </section>
    <div className="game-layout">
      <section className="board-section" aria-label="オセロの盤面">
        <div className="board-heading"><span>OTHELLO</span><span>{game.move === 0 ? '黒からスタート' : `${game.move} 手目`}</span></div>
        <div className="board-frame">
          <div className="column-labels" aria-hidden="true">{'ABCDEFGH'.split('').map(c => <span key={c}>{c}</span>)}</div>
          <div className="board-with-rows"><div className="row-labels" aria-hidden="true">{Array.from({length:8}, (_,i)=><span key={i}>{i+1}</span>)}</div>
          <div className="board" role="group" aria-label="8行8列の盤面。目印のあるマスに置けます">
            {game.board.map((cell, i) => <button key={i} type="button" className={`square ${moves.includes(i) ? 'legal' : ''}`} disabled={!moves.includes(i)} onClick={() => setGame(g => humanMove(g,mode,i,resetOpen))} aria-label={`${'ABCDEFGH'[i%8]}${Math.floor(i/8)+1}、${cell ? name(cell) + 'の石' : moves.includes(i) ? name(game.turn) + 'を置けます' : '空きマス'}`}>
              {cell ? <span key={`${i}-${cell}-${game.changed.includes(i) ? game.move : 'still'}`} className={`disc ${cell === 1 ? 'black' : 'white'} ${game.changed.includes(i) ? 'flipped' : ''} ${game.last === i ? 'last' : ''}`} aria-hidden="true" /> : moves.includes(i) ? <span className="move-hint" aria-hidden="true" /> : null}
            </button>)}
          </div></div>
        </div>
        <p className="legend"><span className="legend-dot" /> {thinking ? 'コンピューターが考えています' : '目印のあるマスに置けます'}<span className="last-legend">小さな点は最後に置いた石</span></p>
      </section>
      <aside className="game-info">
        <div className="turn-panel" role="status" aria-live="polite" aria-atomic="true">
          <p className="eyebrow">{game.over ? '対戦終了' : 'いまの手番'}</p>
          <div className="turn-title">{!game.over && <span className={`disc turn-disc ${game.turn === 1 ? 'black' : 'white'}`} aria-hidden="true" />}<h2>{game.over ? result : thinking ? '考えています…' : `${name(game.turn)}の番です`}</h2>{!game.over && !thinking && <ArrowRight size={23} className="turn-arrow" aria-hidden="true" />}</div>
          <p className="turn-help">{game.over ? `黒 ${counts.black} 枚・白 ${counts.white} 枚` : game.passed ? `${name(game.passed)}は置けないためパス。${name(game.turn)}が続けて置きます。` : thinking ? `コンピューター（${difficultyNames[difficulty]}）の番です。` : mode === 'computer' ? 'あなたの番です。目印をタップしよう。' : '目印をタップして、石を置こう。'}</p>
        </div>
        {mode === 'computer' && <p className="score-owners">黒：あなた ／ 白：コンピューター</p>}
        <div className="scores" aria-label="石の枚数">
          <div className={`score ${!game.over && game.turn === 1 ? 'active' : ''}`}><div className="score-label"><span className="disc black" aria-hidden="true" />黒<span className="turn-tag">{!game.over && game.turn === 1 ? '手番' : ''}</span></div><p>{counts.black}<span>枚</span></p></div>
          <div className={`score ${!game.over && game.turn === 2 ? 'active' : ''}`}><div className="score-label"><span className="disc white" aria-hidden="true" />白<span className="turn-tag">{!game.over && game.turn === 2 ? '手番' : ''}</span></div><p>{counts.white}<span>枚</span></p></div>
        </div>
        <AlertDialog open={resetOpen} onOpenChange={closeReset}><AlertDialogTrigger className="reset-button"><RotateCcw size={18} aria-hidden="true" />最初から遊ぶ</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pendingSettings ? '設定を変えて始めますか？' : '最初から遊びますか？'}</AlertDialogTitle><AlertDialogDescription>{pendingSettings ? `いまの対戦を終えて、${pendingSettings.mode === 'computer' ? 'コンピューター対戦（' + difficultyNames[pendingSettings.difficulty] + '）' : '2人対戦'}を黒の番から始めます。` : 'いまの対戦を終えて、黒の番から始めます。'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>対戦に戻る</AlertDialogCancel><AlertDialogAction onClick={restart}>最初から遊ぶ</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <details className="rules"><summary>あそび方</summary><ol><li>対戦モードを選びます。コンピューター対戦では強さを選べます。あなたが黒、コンピューターが白です。</li><li>黒から交互に置きます。2人対戦では、黒と白を決めて端末を交代で使います。</li><li>自分の石で挟むと、間にある相手の石がひっくり返ります。縦・横・斜めのすべてが対象です。</li><li>置けないときは自動でパスします。</li><li>2人とも置けなくなったら終了。石が多いほうの勝ちです。</li></ol></details>
      </aside>
    </div>
    <footer>{mode === 'computer' ? '自分のペースで、一局。' : 'ひとつの盤面を、ふたりで。'}</footer>
  </main>;
}
