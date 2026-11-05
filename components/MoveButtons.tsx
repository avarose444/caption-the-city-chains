"use client";

import { useState, useTransition } from "react";
import { moveStep } from "@/app/(tool)/actions";

const arrowClass =
  "flex h-9 w-9 items-center justify-center border-2 border-ink text-lg leading-none transition-colors hover:bg-ink hover:text-background disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink";

export default function MoveButtons({ stepId, chainId, order, isFirst, isLast }: { stepId: string; chainId: string; order: number; isFirst: boolean; isLast: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const move = (direction: -1 | 1) =>
    start(async () => {
      const result = await moveStep(stepId, chainId, direction);
      setError(result.error ?? null);
    });

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-1">
        <button type="button" disabled={isFirst || pending} onClick={() => move(-1)} aria-label={`Move step ${order} up`} title="Move up" className={arrowClass}>↑</button>
        <button type="button" disabled={isLast || pending} onClick={() => move(1)} aria-label={`Move step ${order} down`} title="Move down" className={arrowClass}>↓</button>
      </div>
      {error && <p className="max-w-xs font-mono text-xs text-rouge" role="alert">{error}</p>}
    </div>
  );
}
