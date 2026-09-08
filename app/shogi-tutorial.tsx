'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { shogiLessons } from '@/lib/shogi-tutorial';
import { legalShogiMoves, playShogi, sameMove } from '@/lib/shogi';
import type { HandKind, ShogiMove } from '@/lib/shogi';
import ShogiBoard, { selectedMoves } from './shogi-board';
import type { Selection } from './shogi-board';
import ShogiPromotion from './shogi-promotion';
export default function ShogiTutorial({ onStart }: { onStart: () => void }) {
  const [index, setIndex] = useState(0),
    [game, setGame] = useState(() => shogiLessons[0].position()),
    [selection, setSelection] = useState<Selection>(null),
    [choices, setChoices] = useState<ShogiMove[] | null>(null),
    [done, setDone] = useState(false),
    [feedback, setFeedback] = useState('');
  const lesson = shogiLessons[index],
    moves = legalShogiMoves(game);
  const load = (i: number) => {
    setIndex(i);
    setGame(shogiLessons[i].position());
    setSelection(null);
    setChoices(null);
    setDone(false);
    setFeedback('');
  };
  const attempt = (move: ShogiMove) => {
    setChoices(null);
    if (!sameMove(move, lesson.move)) {
      setFeedback(
        lesson.move.promote
          ? 'この練習では、★へ動かして「成る」を選んでみよう。'
          : '今は★のマスを目指してみよう。駒を選び直せます。',
      );
      return;
    }
    setGame(playShogi(game, move));
    setDone(true);
    setSelection(null);
    setFeedback(lesson.success);
  };
  const square = (i: number) => {
    if (done) return;
    if (game.board[i]?.side === game.turn) {
      setSelection({ from: i });
      return;
    }
    const candidates = selectedMoves(moves, selection).filter(
      (m) => m.to === i,
    );
    if (candidates.length > 1) setChoices(candidates);
    else if (candidates[0]) attempt(candidates[0]);
  };
  const hand = (k: HandKind) => {
    if (!done) setSelection({ from: null, drop: k });
  };
  return (
    <section className="shogi-tutorial">
      <ol className="lesson-groups" aria-label="練習の順番">
        {['動き方', '取り方', '成り', '持ち駒'].map((label, i) => (
          <li
            key={label}
            className={i === lesson.group ? 'current' : ''}
            aria-current={i === lesson.group ? 'step' : undefined}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      <div className="shogi-layout">
        <div>
          <ShogiBoard
            game={game}
            moves={moves}
            selection={selection}
            onSquare={square}
            onHand={hand}
            disabled={done || !!choices}
            target={done ? undefined : lesson.move.to}
          />
        </div>
        <aside className="shogi-side lesson-card">
          <p className="eyebrow">
            練習 {index + 1} / {shogiLessons.length}
          </p>
          <h2>{lesson.title}</h2>
          <p className="lesson-instruction">{lesson.instruction}</p>
          <p className="lesson-feedback" role="status" aria-live="polite">
            {feedback || '① 駒をタップ　② ★のマスをタップ'}
          </p>
          {done &&
            (index < shogiLessons.length - 1 ? (
              <Button className="shogi-action" onClick={() => load(index + 1)}>
                次の練習へ →
              </Button>
            ) : (
              <div>
                <h3>基本の練習、完了！</h3>
                <p>
                  対戦では交互に指します。相手の王が逃げられない「詰み」を目指そう。王手されたら、自分の王を守る手を選びます。
                </p>
                <Button className="shogi-action" onClick={onStart}>
                  弱いCPUと対戦してみる
                </Button>
              </div>
            ))}
          <div className="lesson-controls">
            <Button
              variant="outline"
              className="shogi-action"
              onClick={() => load(index)}
            >
              この練習をもう一度
            </Button>
            {index > 0 && (
              <Button
                variant="ghost"
                className="shogi-action"
                onClick={() => load(index - 1)}
              >
                前の練習へ
              </Button>
            )}
          </div>
          <p className="shogi-note">
            本番では二歩や王手放置などの反則手は選べません。駒を選ぶと、動ける場所に目印が出ます。
          </p>
        </aside>
      </div>
      <ShogiPromotion
        choices={choices}
        onChoose={attempt}
        onCancel={() => setChoices(null)}
      />
    </section>
  );
}
