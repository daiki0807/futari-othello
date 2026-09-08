import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialShogi,
  legalShogiMoves,
  targets,
  makePiece,
  emptyHand,
  shogiPosition,
  playShogi,
  nextShogi,
  inCheck,
  positionKey,
  sameMove,
  canConsiderImpasse,
  agreeImpasse,
  impassePoints,
} from '../lib/shogi.ts';
import { chooseShogiMove, applyShogiCpu } from '../lib/shogi-ai.ts';
import { shogiLessons } from '../lib/shogi-tutorial.ts';
const move = (from, to, promote = false) => ({ from, to, promote });
const drop = (kind, to) => ({ from: null, to, drop: kind, promote: false });
function fixture(pieces, turn = 1, hand = { 1: emptyHand(), 2: emptyHand() }) {
  const b = Array(81).fill(null);
  for (const [i, k, s, p = false] of pieces) b[i] = makePiece(k, s, p);
  return shogiPosition(b, turn, hand);
}
function has(g, m) {
  return legalShogiMoves(g).some((x) => sameMove(x, m));
}

test('initial setup and independent standard perft counts', () => {
  const g = initialShogi();
  assert.equal(g.board.filter(Boolean).length, 40);
  assert.equal(legalShogiMoves(g).length, 30);
  assert.deepEqual(g.board[70], makePiece('R', 1));
  assert.deepEqual(g.board[16], makePiece('B', 2));
  const count = (p, d) =>
    d === 0
      ? 1
      : legalShogiMoves(p).reduce(
          (n, m) => n + count(nextShogi(p, m), d - 1),
          0,
        );
  assert.equal(count(g, 2), 900);
  assert.equal(count(g, 3), 25470);
});
test('all eight pieces, both orientations and promoted movement', () => {
  const patterns = {
    P: [31],
    L: [31, 22, 13, 4],
    N: [21, 23],
    S: [30, 31, 32, 48, 50],
    G: [30, 31, 32, 39, 41, 49],
    K: [30, 31, 32, 39, 41, 48, 49, 50],
  };
  for (const [kind, expected] of Object.entries(patterns))
    for (const side of [1, 2]) {
      const g = fixture([[40, kind, side]]);
      assert.deepEqual(
        targets(g.board, 40).sort((a, b) => a - b),
        (side === 1 ? expected : expected.map((i) => 80 - i)).sort(
          (a, b) => a - b,
        ),
      );
    }
  for (const kind of ['P', 'L', 'N', 'S']) {
    const g = fixture([[40, kind, 1, true]]);
    assert.deepEqual(
      targets(g.board, 40).sort((a, b) => a - b),
      [30, 31, 32, 39, 41, 49],
    );
  }
  for (const [kind, a, b] of [
    ['R', 16, 20],
    ['B', 16, 20],
  ]) {
    assert.equal(targets(fixture([[40, kind, 1]]).board, 40).length, a);
    assert.equal(targets(fixture([[40, kind, 1, true]]).board, 40).length, b);
  }
  const blocked = fixture([
    [40, 'R', 1],
    [22, 'P', 1],
    [42, 'P', 2],
  ]);
  assert.ok(!targets(blocked.board, 40).includes(13));
  assert.ok(!targets(blocked.board, 40).includes(43));
  const knight = fixture([
    [40, 'N', 1],
    [31, 'P', 1],
    [30, 'P', 2],
  ]);
  assert.deepEqual(targets(knight.board, 40), [21, 23]);
});
test('capture demotes into hand; promotion choices and mandatory promotion', () => {
  let g = fixture([
    [80, 'K', 1],
    [0, 'K', 2],
    [58, 'P', 1],
    [49, 'S', 2, true],
  ]);
  const before = structuredClone(g);
  g = playShogi(g, move(58, 49));
  assert.equal(g.hands[1].S, 1);
  assert.equal(g.board[49].kind, 'P');
  assert.equal(g.turn, 2);
  assert.equal(before.board[49].promoted, true);
  for (const [kind, from, to] of [
    ['P', 13, 4],
    ['L', 13, 4],
    ['N', 22, 3],
    ['N', 31, 12],
  ]) {
    const p = fixture([
      [80, 'K', 1],
      [0, 'K', 2],
      [from, kind, 1],
    ]);
    assert.equal(has(p, move(from, to)), false);
    assert.equal(has(p, move(from, to, true)), true);
  }
  g = fixture([
    [80, 'K', 1],
    [0, 'K', 2],
    [31, 'S', 1],
  ]);
  assert.ok(has(g, move(31, 22)) && has(g, move(31, 22, true)));
  assert.equal(has(g, move(31, 40, true)), false);
  const leave = fixture([
    [80, 'K', 1],
    [0, 'K', 2],
    [22, 'S', 1],
  ]);
  assert.ok(has(leave, move(22, 30, true)));
  const gold = fixture([
    [80, 'K', 1],
    [0, 'K', 2],
    [31, 'G', 1],
  ]);
  assert.equal(has(gold, move(31, 22, true)), false);
});
test('drops: nifu, promoted pawn exception, dead ranks, no occupied squares', () => {
  const h = { 1: emptyHand(), 2: emptyHand() };
  h[1].P = 1;
  h[1].L = 1;
  h[1].N = 1;
  let g = fixture(
    [
      [80, 'K', 1],
      [0, 'K', 2],
      [58, 'P', 1],
    ],
    1,
    h,
  );
  assert.equal(has(g, drop('P', 40)), false);
  assert.equal(has(g, drop('P', 3)), false);
  assert.equal(has(g, drop('L', 3)), false);
  assert.equal(has(g, drop('N', 12)), false);
  assert.ok(has(g, drop('N', 21)));
  assert.equal(has(g, drop('P', 0)), false);
  g.board[58].promoted = true;
  assert.ok(has(g, drop('P', 40)));
  g = playShogi(g, drop('P', 40));
  assert.equal(g.hands[1].P, 0);
  assert.deepEqual(g.board[40], makePiece('P', 1));
});
test('self check, pinned pieces, adjacent kings, no king capture', () => {
  const g = fixture([
    [76, 'K', 1],
    [0, 'K', 2],
    [4, 'R', 2],
    [67, 'G', 1],
  ]);
  assert.equal(inCheck(g, 1), false);
  assert.equal(has(g, move(67, 66)), false);
  assert.ok(has(g, move(67, 58)));
  const checked = fixture([
    [76, 'K', 1],
    [0, 'K', 2],
    [4, 'R', 2],
    [60, 'P', 1],
  ]);
  assert.equal(inCheck(checked, 1), true);
  assert.equal(has(checked, move(60, 51)), false);
  const kings = fixture([
    [40, 'K', 1],
    [22, 'K', 2],
  ]);
  assert.equal(has(kings, move(40, 31)), false);
  const capture = fixture([
    [80, 'K', 1],
    [0, 'K', 2],
    [9, 'R', 1],
  ]);
  assert.equal(has(capture, move(9, 0)), false);
  assert.strictEqual(playShogi(g, move(-1, 120)), g);
});
function mateFixture() {
  return fixture([
    [80, 'K', 1],
    [4, 'K', 2],
    [3, 'L', 2],
    [5, 'L', 2],
    [12, 'P', 2],
    [14, 'P', 2],
    [22, 'G', 1],
  ]);
}
test('pawn drop mate is forbidden; pawn push mate and gold drop mate are legal', () => {
  let g = mateFixture();
  g.hands[1].P = 1;
  assert.equal(has(g, drop('P', 13)), false);
  const escape = mateFixture();
  escape.board[5] = null;
  escape.hands[1].P = 1;
  assert.ok(has(escape, drop('P', 13)));
  g = mateFixture();
  g.board[22] = makePiece('P', 1);
  g.board[21] = makePiece('G', 1);
  assert.ok(has(g, move(22, 13)));
  const mate = playShogi(g, move(22, 13));
  assert.equal(mate.result?.reason, 'mate');
  assert.equal(mate.result?.winner, 1);
  g = mateFixture();
  g.hands[1].G = 1;
  assert.ok(has(g, drop('G', 13)));
  assert.equal(playShogi(g, drop('G', 13)).result?.reason, 'mate');
  for (const level of ['normal', 'hard']) {
    const ai = chooseShogiMove(g, level, { maxMs: 200 });
    assert.equal(playShogi(g, ai).result?.winner, 1);
  }
});
test('fourfold repetition includes turn and hands; continuous check loses', () => {
  let g = fixture([
    [80, 'K', 1],
    [0, 'K', 2],
  ]);
  const key = positionKey(g);
  assert.notEqual(key, positionKey({ ...g, turn: 2 }));
  const h = structuredClone(g);
  h.hands[1].P = 1;
  assert.notEqual(key, positionKey(h));
  for (let i = 0; i < 3; i++)
    for (const m of [move(80, 79), move(0, 1), move(79, 80), move(1, 0)])
      g = playShogi(g, m);
  assert.deepEqual(g.result, { winner: null, reason: 'repetition' });
  g = fixture(
    [
      [80, 'K', 1],
      [4, 'K', 2],
      [22, 'R', 1],
    ],
    2,
  );
  for (let i = 0; i < 3; i++)
    for (const m of [move(4, 5), move(22, 23), move(5, 4), move(23, 22)])
      g = playShogi(g, m);
  assert.deepEqual(g.result, { winner: 2, reason: 'perpetual-check' });
});
test('tutorials use legal moves and only correct action completes the intended lesson', () => {
  assert.equal(shogiLessons.length, 11);
  for (const lesson of shogiLessons) {
    const g = lesson.position();
    assert.ok(has(g, lesson.move), lesson.title);
    assert.notStrictEqual(playShogi(g, lesson.move), g);
  }
  const capture = playShogi(shogiLessons[8].position(), shogiLessons[8].move);
  assert.equal(capture.hands[1].S, 1);
  const promoted = playShogi(shogiLessons[9].position(), shogiLessons[9].move);
  assert.equal(promoted.board[22].promoted, true);
  const dropped = playShogi(shogiLessons[10].position(), shogiLessons[10].move);
  assert.equal(dropped.hands[1].S, 0);
  assert.equal(dropped.board[40].kind, 'S');
});
test('AI levels produce legal moves; stale worker replies and disabled modes cannot move', () => {
  let g = initialShogi();
  for (let i = 0; i < 12 && !g.result; i++) {
    const choices = legalShogiMoves(g);
    for (const d of ['easy', 'normal', 'hard']) {
      const m = chooseShogiMove(g, d, {
        random: () => 0.25,
        maxMs: 15,
        maxNodes: 80,
        maxDepth: 2,
      });
      assert.ok(choices.some((x) => sameMove(x, m)));
    }
    g = playShogi(g, choices[(i * 7) % choices.length]);
  }
  const white = playShogi(initialShogi(), move(58, 49)),
    m = chooseShogiMove(white, 'easy');
  assert.notStrictEqual(applyShogiCpu(white, white, m, true), white);
  assert.strictEqual(applyShogiCpu(white, white, m, false), white);
  const reset = initialShogi();
  assert.strictEqual(applyShogiCpu(reset, white, m, true), reset);
  assert.equal(
    chooseShogiMove(
      { ...white, result: { winner: 1, reason: 'resign' } },
      'hard',
    ),
    null,
  );
});
test('agreed impasse uses 24-point count, and requires both kings in enemy camp', () => {
  const g = fixture([
    [4, 'K', 1],
    [76, 'K', 2],
  ]);
  g.hands[1].R = 2;
  g.hands[1].B = 1;
  g.hands[1].G = 4;
  g.hands[1].P = 8;
  g.hands[2].B = 1;
  g.hands[2].S = 4;
  g.hands[2].N = 4;
  g.hands[2].L = 4;
  g.hands[2].P = 10;
  assert.ok(canConsiderImpasse(g));
  assert.equal(impassePoints(g, 1), 27);
  assert.equal(impassePoints(g, 2), 27);
  assert.deepEqual(agreeImpasse(g).result, { winner: null, reason: 'impasse' });
  assert.equal(canConsiderImpasse(initialShogi()), false);
});
