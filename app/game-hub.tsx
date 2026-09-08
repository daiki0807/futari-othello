'use client';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OthelloGame from './othello-game';
import ShogiGame from './shogi-game';
export default function GameHub() {
  const [game, setGame] = useState('othello');
  return (
    <Tabs
      value={game}
      onValueChange={(value) => setGame(String(value))}
      className="game-hub"
    >
      <div className="game-switch">
        <TabsList className="game-switch-list" aria-label="ゲームを選ぶ">
          <TabsTrigger value="othello">● オセロ</TabsTrigger>
          <TabsTrigger value="shogi">王 将棋</TabsTrigger>
        </TabsList>
        <span>切り替えても対局は残ります</span>
      </div>
      <TabsContent value="othello" keepMounted>
        <OthelloGame active={game === 'othello'} />
      </TabsContent>
      <TabsContent value="shogi" keepMounted>
        <ShogiGame active={game === 'shogi'} />
      </TabsContent>
    </Tabs>
  );
}
