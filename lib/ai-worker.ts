import { chooseMove } from './ai.ts';
import type { Difficulty } from './ai.ts';
import type { Game } from './game.ts';
self.onmessage = (event: MessageEvent<{game: Game; difficulty: Difficulty}>) => {
  self.postMessage({move: chooseMove(event.data.game,event.data.difficulty)});
};
