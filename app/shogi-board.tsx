'use client';
import {
  coordinate,
  handKinds,
  pieceName,
  shortName,
  sideName,
} from '@/lib/shogi';
import type { HandKind, Shogi, ShogiMove, Side } from '@/lib/shogi';
export type Selection =
  | { from: number; drop?: never }
  | { from: null; drop: HandKind }
  | null;
export function selectedMoves(moves: ShogiMove[], selection: Selection) {
  return selection
    ? moves.filter((m) =>
        selection.from === null
          ? m.drop === selection.drop
          : m.from === selection.from,
      )
    : [];
}
export default function ShogiBoard({
  game,
  moves,
  selection,
  onSquare,
  onHand,
  disabled = false,
  target,
}: {
  game: Shogi;
  moves: ShogiMove[];
  selection: Selection;
  onSquare: (i: number) => void;
  onHand: (k: HandKind) => void;
  disabled?: boolean;
  target?: number;
}) {
  const options = selectedMoves(moves, selection),
    destinations = new Set(options.map((m) => m.to));
  const hand = (side: Side) => (
    <div
      className={`shogi-hand ${game.turn === side ? 'hand-active' : ''}`}
      aria-label={`${sideName(side)}の持ち駒`}
    >
      <p>
        {side === 1 ? '▲' : '△'} {sideName(side)}の持ち駒
      </p>
      <div className="hand-pieces">
        {handKinds.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled || side !== game.turn || !game.hands[side][k]}
            aria-pressed={side === game.turn && selection?.drop === k}
            onClick={() => onHand(k)}
            aria-label={`${sideName(side)}の持ち駒、${shortName(k)} ${game.hands[side][k]}枚`}
          >
            <span>{shortName(k)}</span>
            <b>{game.hands[side][k]}</b>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="shogi-board-area">
      {hand(2)}
      <div className="shogi-board-frame">
        <div className="shogi-cols" aria-hidden="true">
          {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <div className="shogi-board-line">
          <div
            className="shogi-board"
            role="group"
            aria-label="将棋の9行9列の盤面"
          >
            {game.board.map((p, i) => {
              const selectable = !!p && p.side === game.turn;
              const allowed = destinations.has(i);
              const selected = selection?.from === i;
              return (
                <button
                  key={i}
                  type="button"
                  className={`shogi-square ${selected ? 'picked' : ''} ${allowed ? 'possible' : ''} ${game.last?.to === i ? 'last-move' : ''} ${target === i ? 'lesson-target' : ''}`}
                  disabled={disabled || (!selectable && !allowed)}
                  onClick={() => onSquare(i)}
                  aria-pressed={selected}
                  aria-label={`${coordinate(i)}、${p ? sideName(p.side) + 'の' + pieceName(p) : '空きマス'}${allowed ? '、ここに動かせます' : ''}${target === i ? '、練習の目標' : ''}`}
                >
                  {p && (
                    <span
                      className={`shogi-piece ${p.side === 2 ? 'gote' : ''} ${p.promoted ? 'promoted' : ''}`}
                      aria-hidden="true"
                    >
                      {pieceName(p)}
                    </span>
                  )}
                  {allowed && !p && (
                    <span className="shogi-move-dot" aria-hidden="true" />
                  )}
                  {target === i && (
                    <span className="target-star" aria-hidden="true">
                      ★
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="shogi-rows" aria-hidden="true">
            {'一二三四五六七八九'.split('').map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>
      </div>
      {hand(1)}
    </div>
  );
}
