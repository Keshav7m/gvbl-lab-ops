"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  label?: string;
}

const HEIGHT = 120;

/** Draw-to-sign pad (mouse, pen or finger). Stores a transparent PNG data URL. */
export function SignaturePad({ value, onChange, disabled, label = "Signature" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(!value);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth;
    canvas.width = width * ratio;
    canvas.height = HEIGHT * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#231C2E";
    hasInk.current = false;
  }, []);

  useEffect(() => {
    if (!editing) return;
    setupCanvas();
  }, [editing, setupCanvas]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    hasInk.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (hasInk.current && canvasRef.current) onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    onChange(null);
    setEditing(true);
    setTimeout(setupCanvas, 0);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-soft">{label}</span>
        {!disabled && (
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline">
            <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
          </button>
        )}
      </div>
      {!editing && value ? (
        <div className="flex h-[120px] items-center justify-center rounded-md border border-rule bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="max-h-[110px] max-w-full" />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          aria-label={`${label} drawing area`}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className={cn(
            "block h-[120px] w-full touch-none rounded-md border border-dashed border-violet-300 bg-[linear-gradient(transparent_86px,#E4DDEC_86px,#E4DDEC_87px,transparent_87px)]",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair",
          )}
        />
      )}
      {editing && !disabled && <p className="mt-1 text-xs text-ink-muted">Sign above the line with a mouse, pen or finger. Optional.</p>}
    </div>
  );
}
