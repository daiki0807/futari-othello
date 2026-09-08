import { chooseShogiMove } from './shogi-ai.ts';
import type { Shogi } from './shogi.ts';
import type { Difficulty } from './ai.ts';
self.onmessage = (
  event: MessageEvent<{ game: Shogi; difficulty: Difficulty }>,
) => {
  self.postMessage({
    move: chooseShogiMove(event.data.game, event.data.difficulty),
  });
};
