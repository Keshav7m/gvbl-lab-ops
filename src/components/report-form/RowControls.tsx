"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

export function RowControls({
  index,
  count,
  onUp,
  onDown,
  onRemove,
  label,
  disabled,
}: {
  index: number;
  count: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) return null;
  const btn = "rounded p-1.5 text-ink-faint transition-colors hover:bg-violet-50 hover:text-violet-700 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={btn} onClick={onUp} disabled={index === 0} aria-label={`Move ${label} up`}>
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" className={btn} onClick={onDown} disabled={index === count - 1} aria-label={`Move ${label} down`}>
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="rounded p-1.5 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
