'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ShogiMove } from '@/lib/shogi';
export default function ShogiPromotion({
  choices,
  onChoose,
  onCancel,
}: {
  choices: ShogiMove[] | null;
  onChoose: (m: ShogiMove) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={!!choices}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>成りますか？</DialogTitle>
          <DialogDescription>
            成ると駒の動きが変わります。取られるまでは元に戻せません。
          </DialogDescription>
        </DialogHeader>
        <div className="shogi-dialog-actions">
          {choices?.map((m) => (
            <Button
              key={String(m.promote)}
              className="shogi-action"
              variant={m.promote ? 'default' : 'outline'}
              onClick={() => onChoose(m)}
            >
              {m.promote ? '成る' : '成らない'}
            </Button>
          ))}
          <Button variant="ghost" className="shogi-action" onClick={onCancel}>
            選び直す
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
