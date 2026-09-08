export type Side = 1 | 2;
export type Kind = 'P' | 'L' | 'N' | 'S' | 'G' | 'B' | 'R' | 'K';
export type HandKind = Exclude<Kind, 'K'>;
export type Piece = { kind: Kind; side: Side; promoted: boolean };
export type Hand = Record<HandKind, number>;
export type ShogiMove =
  | { from: number; to: number; promote: boolean; drop?: never }
  | { from: null; to: number; promote: false; drop: HandKind };
export type ShogiResult = {
  winner: Side | null;
  reason:
    | 'mate'
    | 'no-moves'
    | 'repetition'
    | 'perpetual-check'
    | 'resign'
    | 'impasse';
};
export type Shogi = {
  board: (Piece | null)[];
  hands: Record<Side, Hand>;
  turn: Side;
  ply: number;
  last: ShogiMove | null;
  result: ShogiResult | null;
  history: { key: string; mover: Side | null; check: boolean }[];
};
export const handKinds: HandKind[] = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];
export const other = (s: Side): Side => (s === 1 ? 2 : 1);
export const sideName = (s: Side) => (s === 1 ? '先手' : '後手');
const normalNames: Record<Kind, string> = {
  P: '歩',
  L: '香',
  N: '桂',
  S: '銀',
  G: '金',
  B: '角',
  R: '飛',
  K: '王',
};
const promotedNames: Partial<Record<Kind, string>> = {
  P: 'と',
  L: '成香',
  N: '成桂',
  S: '成銀',
  B: '馬',
  R: '竜',
};
export const pieceName = (p: Piece) =>
  p.promoted
    ? (promotedNames[p.kind] ?? normalNames[p.kind])
    : normalNames[p.kind];
export const shortName = (k: Kind) => normalNames[k];
export const coordinate = (i: number) =>
  `${9 - (i % 9)}${'一二三四五六七八九'[Math.floor(i / 9)]}`;
export const makePiece = (kind: Kind, side: Side, promoted = false): Piece => ({
  kind,
  side,
  promoted,
});
export const emptyHand = (): Hand => ({
  P: 0,
  L: 0,
  N: 0,
  S: 0,
  G: 0,
  B: 0,
  R: 0,
});
export function positionKey(
  g: Pick<Shogi, 'board' | 'hands' | 'turn'>,
): string {
  return (
    g.board
      .map((p) => (p ? `${p.side}${p.kind}${p.promoted ? '+' : ''}` : '.'))
      .join(',') +
    '|' +
    g.turn +
    '|' +
    [1, 2]
      .map((s) => handKinds.map((k) => g.hands[s as Side][k]).join(','))
      .join('|')
  );
}
export function shogiPosition(
  board: (Piece | null)[],
  turn: Side = 1,
  hands: Record<Side, Hand> = { 1: emptyHand(), 2: emptyHand() },
): Shogi {
  const game: Shogi = {
    board,
    hands,
    turn,
    ply: 0,
    last: null,
    result: null,
    history: [],
  };
  game.history = [{ key: positionKey(game), mover: null, check: false }];
  return game;
}
export function initialShogi(): Shogi {
  const board: (Piece | null)[] = Array(81).fill(null),
    back: Kind[] = ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'];
  for (let c = 0; c < 9; c++) {
    board[c] = makePiece(back[c], 2);
    board[18 + c] = makePiece('P', 2);
    board[54 + c] = makePiece('P', 1);
    board[72 + c] = makePiece(back[c], 1);
  }
  board[10] = makePiece('R', 2);
  board[16] = makePiece('B', 2);
  board[64] = makePiece('B', 1);
  board[70] = makePiece('R', 1);
  return shogiPosition(board);
}
const goldSteps = [
  [1, -1],
  [1, 0],
  [1, 1],
  [0, -1],
  [0, 1],
  [-1, 0],
];
export function targets(board: (Piece | null)[], from: number): number[] {
  const p = board[from];
  if (!p) return [];
  const f = p.side === 1 ? -1 : 1,
    r = Math.floor(from / 9),
    c = from % 9,
    answer: number[] = [];
  const step = (dr: number, dc: number, slide = false) => {
    let rr = r + dr * f,
      cc = c + dc;
    while (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) {
      const i = rr * 9 + cc;
      answer.push(i);
      if (!slide || board[i]) break;
      rr += dr * f;
      cc += dc;
    }
  };
  const steps = (list: number[][]) => list.forEach(([dr, dc]) => step(dr, dc));
  if (p.promoted && ['P', 'L', 'N', 'S'].includes(p.kind)) steps(goldSteps);
  else
    switch (p.kind) {
      case 'P':
        step(1, 0);
        break;
      case 'L':
        step(1, 0, true);
        break;
      case 'N':
        steps([
          [2, -1],
          [2, 1],
        ]);
        break;
      case 'S':
        steps([
          [1, -1],
          [1, 0],
          [1, 1],
          [-1, -1],
          [-1, 1],
        ]);
        break;
      case 'G':
        steps(goldSteps);
        break;
      case 'K':
        steps([...goldSteps, [-1, -1], [-1, 1]]);
        break;
      case 'B':
        for (const dr of [-1, 1]) for (const dc of [-1, 1]) step(dr, dc, true);
        if (p.promoted)
          steps([
            [1, 0],
            [-1, 0],
            [0, -1],
            [0, 1],
          ]);
        break;
      case 'R':
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, -1],
          [0, 1],
        ])
          step(dr, dc, true);
        if (p.promoted)
          steps([
            [1, -1],
            [1, 1],
            [-1, -1],
            [-1, 1],
          ]);
        break;
    }
  return answer;
}
export function attacked(
  board: (Piece | null)[],
  square: number,
  by: Side,
): boolean {
  return board.some(
    (p, i) => p?.side === by && targets(board, i).includes(square),
  );
}
export function inCheck(game: Pick<Shogi, 'board'>, side: Side): boolean {
  const king = game.board.findIndex((p) => p?.kind === 'K' && p.side === side);
  return king < 0 || attacked(game.board, king, other(side));
}
export const inCamp = (index: number, side: Side) =>
  side === 1 ? index < 27 : index >= 54;
const deadRank = (kind: Kind, to: number, side: Side) => {
  const rank = side === 1 ? Math.floor(to / 9) : 8 - Math.floor(to / 9);
  return (
    ((kind === 'P' || kind === 'L') && rank === 0) || (kind === 'N' && rank < 2)
  );
};
// Only call this with a move already produced by legalShogiMoves.
export function nextShogi(game: Shogi, move: ShogiMove): Shogi {
  const board = [...game.board],
    hands = { 1: { ...game.hands[1] }, 2: { ...game.hands[2] } };
  if (move.from === null) {
    hands[game.turn][move.drop]--;
    board[move.to] = makePiece(move.drop, game.turn);
  } else {
    const p = board[move.from]!;
    const captured = board[move.to];
    if (captured && captured.kind !== 'K') hands[game.turn][captured.kind]++;
    board[move.to] = { ...p, promoted: p.promoted || move.promote };
    board[move.from] = null;
  }
  return {
    ...game,
    board,
    hands,
    turn: other(game.turn),
    ply: game.ply + 1,
    last: move,
    result: null,
  };
}
function* pseudoMoves(game: Shogi): Generator<ShogiMove> {
  for (let from = 0; from < 81; from++) {
    const p = game.board[from];
    if (!p || p.side !== game.turn) continue;
    for (const to of targets(game.board, from)) {
      const target = game.board[to];
      if (target?.side === game.turn || target?.kind === 'K') continue;
      const canPromote =
        !p.promoted &&
        !['G', 'K'].includes(p.kind) &&
        (inCamp(from, p.side) || inCamp(to, p.side));
      if (p.promoted || !deadRank(p.kind, to, p.side))
        yield { from, to, promote: false };
      if (canPromote) yield { from, to, promote: true };
    }
  }
  for (const kind of handKinds) {
    if (!game.hands[game.turn][kind]) continue;
    for (let to = 0; to < 81; to++) {
      if (game.board[to] || deadRank(kind, to, game.turn)) continue;
      if (
        kind === 'P' &&
        game.board.some(
          (p, i) =>
            p?.side === game.turn &&
            p.kind === 'P' &&
            !p.promoted &&
            i % 9 === to % 9,
        )
      )
        continue;
      yield { from: null, to, drop: kind, promote: false };
    }
  }
}
function* legalIterator(
  game: Shogi,
  skipPawnMate = false,
): Generator<ShogiMove> {
  if (game.result) return;
  for (const move of pseudoMoves(game)) {
    const next = nextShogi(game, move);
    if (inCheck(next, game.turn)) continue;
    if (!skipPawnMate && move.drop === 'P') {
      const king = next.board.findIndex(
        (p) => p?.kind === 'K' && p.side === next.turn,
      );
      if (targets(next.board, move.to).includes(king)) {
        // A check by an adjacent pawn cannot be blocked with a drop. The defender
        // must move its king or capture, so skipping recursive pawn-mate tests is safe.
        if (legalIterator(next, true).next().done) continue;
      }
    }
    yield move;
  }
}
export const legalShogiMoves = (game: Shogi) => Array.from(legalIterator(game));
export const sameMove = (a: ShogiMove, b: ShogiMove) =>
  a.from === b.from &&
  a.to === b.to &&
  a.promote === b.promote &&
  a.drop === b.drop;
export function finishShogiMove(game: Shogi, move: ShogiMove): Shogi {
  const next = nextShogi(game, move),
    check = inCheck(next, next.turn),
    key = positionKey(next);
  next.history = [...game.history, { key, mover: game.turn, check }];
  const occurrences = next.history.flatMap((h, i) =>
    h.key === key ? [i] : [],
  );
  if (occurrences.length >= 4) {
    const cycle = next.history.slice(occurrences[occurrences.length - 4] + 1);
    const checker = ([1, 2] as Side[]).find((s) => {
      const turns = cycle.filter((h) => h.mover === s);
      return turns.length > 0 && turns.every((h) => h.check);
    });
    next.result = checker
      ? { winner: other(checker), reason: 'perpetual-check' }
      : { winner: null, reason: 'repetition' };
  } else if (legalIterator(next).next().done)
    next.result = { winner: game.turn, reason: check ? 'mate' : 'no-moves' };
  return next;
}
export function playShogi(game: Shogi, move: ShogiMove): Shogi {
  if (!legalShogiMoves(game).some((m) => sameMove(m, move))) return game;
  return finishShogiMove(game, move);
}
export const resignShogi = (game: Shogi, side: Side): Shogi =>
  game.result
    ? game
    : { ...game, result: { winner: other(side), reason: 'resign' } };
export function impassePoints(game: Shogi, side: Side): number {
  const value = (kind: Kind) =>
    kind === 'K' ? 0 : kind === 'R' || kind === 'B' ? 5 : 1;
  return (
    game.board.reduce((n, p) => n + (p?.side === side ? value(p.kind) : 0), 0) +
    handKinds.reduce((n, k) => n + value(k) * game.hands[side][k], 0)
  );
}
export function canConsiderImpasse(game: Shogi): boolean {
  return (
    !game.result &&
    ([1, 2] as Side[]).every((s) => {
      const k = game.board.findIndex((p) => p?.kind === 'K' && p.side === s);
      return k >= 0 && inCamp(k, s) && !inCheck(game, s);
    })
  );
}
export function agreeImpasse(game: Shogi): Shogi {
  if (!canConsiderImpasse(game)) return game;
  const a = impassePoints(game, 1),
    b = impassePoints(game, 2);
  return {
    ...game,
    result: {
      winner: a >= 24 && b >= 24 ? null : a < b ? 2 : 1,
      reason: 'impasse',
    },
  };
}
