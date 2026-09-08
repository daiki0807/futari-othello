'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  agreeImpasse,
  canConsiderImpasse,
  coordinate,
  handKinds,
  impassePoints,
  inCheck,
  initialShogi,
  legalShogiMoves,
  pieceName,
  playShogi,
  resignShogi,
  sideName,
} from '@/lib/shogi';
import type { HandKind, ShogiMove } from '@/lib/shogi';
import { applyShogiCpu, chooseShogiMove } from '@/lib/shogi-ai';
import { describePiece, movementText } from '@/lib/shogi-tutorial';
import { difficultyNames } from '@/lib/ai';
import type { Difficulty } from '@/lib/ai';
import ShogiBoard, { selectedMoves } from './shogi-board';
import type { Selection } from './shogi-board';
import ShogiPromotion from './shogi-promotion';
import ShogiTutorial from './shogi-tutorial';
type Settings = { mode: 'two-player' | 'computer'; difficulty: Difficulty };
type Confirmation = {
  type: 'reset' | 'resign' | 'impasse';
  settings?: Settings;
};
export default function ShogiGame({ active = true }: { active?: boolean }) {
  const [game, setGame] = useState(initialShogi),
    [settings, setSettings] = useState<Settings>({
      mode: 'two-player',
      difficulty: 'normal',
    }),
    [tab, setTab] = useState('play');
  const [selection, setSelection] = useState<Selection>(null),
    [choices, setChoices] = useState<ShogiMove[] | null>(null),
    [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState('');
  const live = useRef({
    active,
    tab,
    settings,
    paused: !!confirmation || !!choices,
  });
  live.current = { active, tab, settings, paused: !!confirmation || !!choices };
  const thinking =
    settings.mode === 'computer' && game.turn === 2 && !game.result;
  const locked =
    !active ||
    tab !== 'play' ||
    thinking ||
    !!game.result ||
    !!confirmation ||
    !!choices;
  const allMoves = useMemo(() => legalShogiMoves(game), [game]);
  const check = inCheck(game, game.turn);
  const clear = () => {
    setSelection(null);
    setChoices(null);
    setNotice('');
  };
  const newGame = (next: Settings = settings) => {
    setSettings(next);
    setGame(initialShogi());
    setConfirmation(null);
    clear();
  };
  const change = (next: Settings) => {
    if (next.mode === settings.mode && next.difficulty === settings.difficulty)
      return;
    if (game.ply && !game.result)
      setConfirmation({ type: 'reset', settings: next });
    else newGame(next);
  };
  const commit = (move: ShogiMove) => {
    setGame((g) => playShogi(g, move));
    clear();
    if (move.promote)
      setNotice('成りました。駒を選ぶと新しい動きを確認できます。');
  };
  const square = (i: number) => {
    if (locked) return;
    if (game.board[i]?.side === game.turn) {
      setSelection(selection?.from === i ? null : { from: i });
      return;
    }
    const candidates = selectedMoves(allMoves, selection).filter(
      (m) => m.to === i,
    );
    if (candidates.length > 1) setChoices(candidates);
    else if (candidates[0]) commit(candidates[0]);
  };
  const hand = (k: HandKind) => {
    if (!locked)
      setSelection(selection?.drop === k ? null : { from: null, drop: k });
  };
  useEffect(() => {
    if (!active || tab !== 'play' || !thinking || confirmation || choices)
      return;
    let cancelled = false,
      worker: Worker | undefined;
    const apply = (move: ShogiMove | null) => {
      const latest = live.current;
      if (
        !cancelled &&
        latest.active &&
        latest.tab === 'play' &&
        !latest.paused &&
        latest.settings === settings
      ) {
        setGame((current) => applyShogiCpu(current, game, move, true));
        setSelection(null);
        setNotice('');
      }
    };
    const fallback = () => {
      if (!cancelled)
        apply(
          chooseShogiMove(game, settings.difficulty, {
            maxMs: 90,
            maxNodes: 800,
            maxDepth: 2,
          }),
        );
    };
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(
          new URL('../lib/shogi-worker.ts', import.meta.url),
          { type: 'module' },
        );
        worker.onmessage = (e: MessageEvent<{ move: ShogiMove | null }>) => {
          apply(e.data.move);
          worker?.terminate();
        };
        worker.onerror = () => {
          worker?.terminate();
          fallback();
        };
        worker.postMessage({ game, difficulty: settings.difficulty });
      } catch {
        fallback();
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      worker?.terminate();
    };
  }, [active, tab, thinking, game, settings, confirmation, choices]);
  const selectedPiece =
    selection?.from != null ? game.board[selection.from] : null;
  const help = selection?.drop
    ? `${movementText[selection.drop]} 持ち駒を打つ場所を選んでください。`
    : selectedPiece
      ? describePiece(selectedPiece)
      : '① 自分の駒を選ぶ　② 目印のマスをタップ';
  const resultText = game.result
    ? game.result.winner
      ? `${sideName(game.result.winner)}の勝ち`
      : '引き分け'
    : '';
  const reasons = {
    mate: '詰みです。王を守る手がありません。',
    'no-moves': '指せる手がなくなりました。',
    repetition: '同じ局面が4回現れました（千日手）。指し直して遊べます。',
    'perpetual-check': '連続王手の千日手です。王手を続けた側の負けです。',
    resign: '投了で対局が終わりました。',
    impasse: '合意した持将棋の点数で判定しました。',
  };
  const confirm = () => {
    if (confirmation?.type === 'resign') {
      setGame((g) => resignShogi(g, settings.mode === 'computer' ? 1 : g.turn));
      setConfirmation(null);
      clear();
    } else if (confirmation?.type === 'impasse') {
      setGame(agreeImpasse);
      setConfirmation(null);
      clear();
    } else newGame(confirmation?.settings ?? settings);
  };
  return (
    <main className="game-shell shogi-shell">
      <header className="topbar">
        <h1>
          はじめての将棋
          <span className="title-dot" />
        </h1>
        <span className="players">
          {settings.mode === 'computer' ? 'CPU対戦' : '2人で対戦'}
        </span>
      </header>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(String(v));
          clear();
        }}
        className="shogi-view-tabs"
      >
        <TabsList className="shogi-tabs-list" aria-label="将棋の遊び方">
          <TabsTrigger value="play">対戦する</TabsTrigger>
          <TabsTrigger value="learn">駒を動かして練習</TabsTrigger>
        </TabsList>
        <TabsContent value="play" keepMounted>
          <section className="match-settings" aria-label="将棋の対戦設定">
            <div className="setting-field">
              <p id="shogi-mode-label">対戦モード</p>
              <RadioGroup
                className="mode-options"
                aria-labelledby="shogi-mode-label"
                value={settings.mode}
                onValueChange={(v) =>
                  change({ ...settings, mode: v as Settings['mode'] })
                }
              >
                <label
                  className={`setting-option ${settings.mode === 'two-player' ? 'selected' : ''}`}
                >
                  <RadioGroupItem value="two-player" />
                  2人で対戦
                </label>
                <label
                  className={`setting-option ${settings.mode === 'computer' ? 'selected' : ''}`}
                >
                  <RadioGroupItem value="computer" />
                  コンピューターと対戦
                </label>
              </RadioGroup>
            </div>
            {settings.mode === 'computer' && (
              <div className="setting-field">
                <p id="shogi-level-label">CPUの強さ</p>
                <RadioGroup
                  className="difficulty-options"
                  aria-labelledby="shogi-level-label"
                  value={settings.difficulty}
                  onValueChange={(v) =>
                    change({ ...settings, difficulty: v as Difficulty })
                  }
                >
                  {(['easy', 'normal', 'hard'] as const).map((d) => (
                    <label
                      key={d}
                      className={`setting-option ${settings.difficulty === d ? 'selected' : ''}`}
                    >
                      <RadioGroupItem value={d} />
                      {difficultyNames[d]}
                    </label>
                  ))}
                </RadioGroup>
                <p className="player-assignment">
                  あなたは先手（下側）／CPUは後手（上側）
                </p>
              </div>
            )}
          </section>
          <div className="shogi-status" role="status" aria-live="polite">
            <strong>
              {game.result
                ? resultText
                : thinking
                  ? 'CPUが考えています…'
                  : `${game.turn === 1 ? '▲' : '△'} ${sideName(game.turn)}の番です`}
            </strong>
            {check && !game.result && <span className="check-badge">王手</span>}
            <span>{game.ply} 手目</span>
          </div>
          <div className="shogi-layout">
            <ShogiBoard
              game={game}
              moves={allMoves}
              selection={selection}
              onSquare={square}
              onHand={hand}
              disabled={locked}
            />
            <aside className="shogi-side">
              <section className="shogi-guide">
                <p className="eyebrow">
                  {game.result
                    ? '対局終了'
                    : check
                      ? '王を守ろう'
                      : '駒を選んでみよう'}
                </p>
                <h2>
                  {game.result
                    ? resultText
                    : check
                      ? '王手されています'
                      : thinking
                        ? '相手の手番です'
                        : 'どう動く？'}
                </h2>
                <p role="status">
                  {game.result
                    ? reasons[game.result.reason]
                    : check
                      ? '王を逃がす・相手の駒を取る・間に駒を置くなど、王手を防ぐ手を選びます。'
                      : help}
                </p>
                {selectedPiece && check && <p>{help}</p>}
                {notice && <p className="shogi-notice">{notice}</p>}
                {game.last && (
                  <p className="shogi-note">
                    前の手：
                    {game.last.from === null
                      ? '持ち駒から'
                      : coordinate(game.last.from) + 'から'}{' '}
                    {coordinate(game.last.to)}へ
                    {game.last.promote ? '（成り）' : ''}
                  </p>
                )}
              </section>
              <div className="shogi-controls">
                <Button
                  className="shogi-action"
                  variant="outline"
                  onClick={() => setConfirmation({ type: 'reset' })}
                >
                  最初から対戦する
                </Button>
                <Button
                  className="shogi-action"
                  variant="ghost"
                  disabled={!!game.result}
                  onClick={() => setConfirmation({ type: 'resign' })}
                >
                  投了する
                </Button>
                {canConsiderImpasse(game) && (
                  <Button
                    className="shogi-action"
                    variant="outline"
                    onClick={() => setConfirmation({ type: 'impasse' })}
                  >
                    持将棋を確認する
                  </Button>
                )}
              </div>
              <details className="rules">
                <summary>ルールと駒の動き</summary>
                <p>
                  先手・後手が交互に指します。相手の王が逃げられない「詰み」を目指します。駒の向きが進む方向です。
                </p>
                <p>
                  敵陣の3段に入る・出る・その中で動くと成れます。金と王は成れません。歩・香が一番奥、桂が奥の2段に進む場合は自動で成ります。
                </p>
                <p>
                  持ち駒は空きマスに打ちます。二歩、打ち歩詰め、行き場のない駒、王手放置になる手は選べません。
                </p>
                <p>
                  同一局面4回は千日手。連続王手の場合は王手を続けた側の負けです。両方の王が敵陣に入った持将棋は、詰ませる見込みがないことを確認して24点法で判定できます。入玉宣言法・持ち時間は採用していません。
                </p>
                {(['K', ...handKinds] as const).map((k) => (
                  <p key={k}>{movementText[k]}</p>
                ))}
                <a
                  href="https://www.shogi.or.jp/knowledge/shogi/"
                  target="_blank"
                  rel="noreferrer"
                >
                  日本将棋連盟のルール解説 ↗
                </a>
              </details>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="learn" keepMounted>
          <ShogiTutorial
            onStart={() => {
              setTab('play');
              if (game.ply && !game.result)
                setConfirmation({
                  type: 'reset',
                  settings: { mode: 'computer', difficulty: 'easy' },
                });
              else newGame({ mode: 'computer', difficulty: 'easy' });
            }}
          />
        </TabsContent>
      </Tabs>
      <ShogiPromotion
        choices={choices}
        onChoose={commit}
        onCancel={() => setChoices(null)}
      />
      <AlertDialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation?.type === 'resign'
                ? '投了しますか？'
                : confirmation?.type === 'impasse'
                  ? '持将棋として終了しますか？'
                  : '新しい対局を始めますか？'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.type === 'resign'
                ? `${settings.mode === 'computer' ? 'あなた' : sideName(game.turn)}の負けとして対局を終えます。`
                : confirmation?.type === 'impasse'
                  ? `先手 ${impassePoints(game, 1)}点・後手 ${impassePoints(game, 2)}点。双方が詰ませる見込みがないことを確認してください。各24点以上なら引き分け、24点未満の側は負けです。`
                  : `いまの対局は終了します。${confirmation?.settings?.mode === 'computer' ? 'CPU（' + difficultyNames[confirmation.settings.difficulty] + '）と' : '先手から'}新しい対局を始めます。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻る</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>
              {confirmation?.type === 'resign'
                ? '投了する'
                : confirmation?.type === 'impasse'
                  ? '合意して終了'
                  : '始める'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
