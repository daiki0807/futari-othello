import { emptyHand, makePiece, shogiPosition } from './shogi.ts';
import type { Kind, Shogi, ShogiMove, Piece } from './shogi.ts';
export const movementText: Record<Kind, string> = {
  P: '歩（ふ）は、前に1マス進みます。後ろには戻れません。',
  L: '香（きょう）は、前へまっすぐ何マスでも進めます。ほかの駒は飛び越せません。',
  N: '桂（けい）は、2マス前の左右にジャンプします。途中に駒があっても飛び越せます。',
  S: '銀（ぎん）は、前と斜め前・斜め後ろへ1マス進めます。真横と真後ろには進めません。',
  G: '金（きん）は、前・横・後ろと斜め前へ1マス進めます。斜め後ろには進めません。',
  B: '角（かく）は、斜めへ何マスでも進めます。ほかの駒は飛び越せません。',
  R: '飛（ひ）は、縦と横へ何マスでも進めます。ほかの駒は飛び越せません。',
  K: '王（おう）は、周りの8方向へ1マス進めます。相手の駒に取られる場所には進めません。',
};
export function describePiece(p: Piece): string {
  if (!p.promoted) return movementText[p.kind];
  if (p.kind === 'R')
    return '竜（りゅう）は、飛車の動きに加えて、斜めにも1マス動けます。';
  if (p.kind === 'B')
    return '馬（うま）は、角の動きに加えて、縦と横にも1マス動けます。';
  return '成った歩・香・桂・銀は、金と同じ動きです。斜め後ろ以外へ1マス動けます。';
}
export type Lesson = {
  group: number;
  title: string;
  instruction: string;
  success: string;
  position: () => Shogi;
  move: ShogiMove;
};
const setup = (kind: Kind): Shogi => {
  const b: (Piece | null)[] = Array(81).fill(null);
  b[0] = makePiece('K', 2);
  b[80] = makePiece('K', 1);
  if (kind === 'K') b[80] = null;
  b[58] = makePiece(kind, 1);
  return shogiPosition(b);
};
export const shogiLessons: Lesson[] = (
  ['P', 'L', 'N', 'S', 'G', 'B', 'R', 'K'] as Kind[]
).map((kind, i) => ({
  group: 0,
  title: [
    '歩を1マス動かす',
    '香をまっすぐ動かす',
    '桂でジャンプ',
    '銀を斜めに動かす',
    '金を横に動かす',
    '角を斜めに動かす',
    '飛車を縦に動かす',
    '王を動かす',
  ][i],
  instruction:
    movementText[kind] + ' 下側の駒を選び、★のマスへ動かしてみよう。',
  success: '動かせました！ 目印のマスが、その駒の動ける場所です。',
  position: () => setup(kind),
  move: { from: 58, to: [49, 22, 39, 48, 57, 28, 31, 57][i], promote: false },
}));
shogiLessons.push({
  group: 1,
  title: '相手の駒を取る',
  instruction:
    '相手の駒があるマスへ進むと、その駒を取れます。歩を選び、★の銀を取ってみよう。',
  success: '銀があなたの持ち駒になりました。取った駒は自分の駒として使えます。',
  position: () => {
    const g = setup('P');
    g.board[49] = makePiece('S', 2);
    return shogiPosition(g.board);
  },
  move: { from: 58, to: 49, promote: false },
});
shogiLessons.push({
  group: 2,
  title: '敵陣に入って成る',
  instruction:
    '相手側の3段に入る・出る・その中で動くと、成れる駒があります。歩を選んで★へ進み、「成る」を選ぼう。',
  success:
    '歩が「と金」に変わりました！ 金と同じ動きになります。金と王は成れません。',
  position: () => {
    const g = setup('P');
    g.board[58] = null;
    g.board[31] = makePiece('P', 1);
    return shogiPosition(g.board);
  },
  move: { from: 31, to: 22, promote: true },
});
shogiLessons.push({
  group: 3,
  title: '持ち駒を打つ',
  instruction:
    '下の「先手の持ち駒」から銀を選び、空いている★のマスをタップ。これを「打つ」といいます。',
  success:
    '持ち駒を打てました！ 取った駒は成る前の姿で使います。これで基本の練習は完了です。',
  position: () => {
    const b: (Piece | null)[] = Array(81).fill(null);
    b[0] = makePiece('K', 2);
    b[80] = makePiece('K', 1);
    const h = { 1: emptyHand(), 2: emptyHand() };
    h[1].S = 1;
    return shogiPosition(b, 1, h);
  },
  move: { from: null, to: 40, drop: 'S', promote: false },
});
