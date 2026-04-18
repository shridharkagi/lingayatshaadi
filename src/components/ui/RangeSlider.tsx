"use client";

/**
 * Range slider primitives built on top of pointer events.
 *
 * We deliberately do NOT use overlapping `<input type="range">` elements:
 * the browser-native overlap approach has a notorious bug where the lower
 * (`max`) input always captures pointerdown over the higher (`min`) thumb,
 * making the left handle un-draggable when the two thumbs are visually
 * close. Instead we render a single track and own both pointer logic and
 * accessibility ourselves.
 *
 *  - <DualRangeSlider />   — two handles (lo/hi)
 *  - <SingleRangeSlider /> — one handle
 *
 * Both are fully controlled, keyboard-accessible (Arrow keys / Home / End),
 * and work the same on touch & mouse via Pointer Events.
 */

import { useCallback, useEffect, useRef } from "react";

type Format = (n: number) => string;

interface SliderShared {
  min: number;
  max: number;
  step?: number;
  format?: Format;
  /** Optional className for the outer container. */
  className?: string;
}

/* ------------------------------ helpers ------------------------------ */

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function snap(value: number, step: number, min: number): number {
  const rounded = Math.round((value - min) / step) * step + min;
  // Avoid floating drift like 22.000000000004
  return Number(rounded.toFixed(6));
}

function pctOf(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}

/** Convert a clientX coordinate to a value within [min, max]. */
function clientXToValue(
  clientX: number,
  rect: DOMRect,
  min: number,
  max: number,
  step: number
): number {
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
  return snap(min + ratio * (max - min), step, min);
}

function Track({
  loPct,
  hiPct,
}: {
  loPct: number;
  hiPct: number;
}) {
  return (
    <>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gray-200" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-[var(--primary)]"
        style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
      />
    </>
  );
}

function Handle({
  pct,
  active,
  onPointerDown,
  onKeyDown,
  ariaLabel,
  ariaValueNow,
  ariaValueMin,
  ariaValueMax,
  ariaValueText,
}: {
  pct: number;
  active: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  ariaLabel: string;
  ariaValueNow: number;
  ariaValueMin: number;
  ariaValueMax: number;
  ariaValueText: string;
}) {
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuenow={ariaValueNow}
      aria-valuemin={ariaValueMin}
      aria-valuemax={ariaValueMax}
      aria-valuetext={ariaValueText}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-[var(--primary)] shadow-sm cursor-grab active:cursor-grabbing focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20 ${
        active ? "z-20 scale-110" : "z-10"
      } transition-transform`}
      style={{ left: `${pct}%`, touchAction: "none" }}
    />
  );
}

function ValuePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold tabular-nums">
      {children}
    </span>
  );
}

/* ------------------------------ DualRangeSlider ------------------------------ */

interface DualRangeSliderProps extends SliderShared {
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
  /** ARIA labels for each thumb */
  ariaLabelMin?: string;
  ariaLabelMax?: string;
  /** Hide the value pills above the track. */
  hideValues?: boolean;
}

export function DualRangeSlider({
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  onChange,
  format = (n) => String(n),
  ariaLabelMin = "Minimum",
  ariaLabelMax = "Maximum",
  hideValues = false,
  className = "",
}: DualRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<"lo" | "hi" | null>(null);

  const lo = clamp(valueMin, min, max);
  const hi = clamp(valueMax, min, max);
  const loPct = pctOf(lo, min, max);
  const hiPct = pctOf(hi, min, max);

  /** Decide which thumb to drag based on click position. */
  const pickThumb = useCallback(
    (clientX: number, rect: DOMRect): "lo" | "hi" => {
      const v = clientXToValue(clientX, rect, min, max, step);
      const dLo = Math.abs(v - lo);
      const dHi = Math.abs(v - hi);
      // When thumbs collide, prefer dragging away from the centre.
      if (dLo === dHi) {
        return v < (lo + hi) / 2 ? "lo" : "hi";
      }
      return dLo < dHi ? "lo" : "hi";
    },
    [lo, hi, min, max, step]
  );

  const setValue = useCallback(
    (v: number, which: "lo" | "hi") => {
      if (which === "lo") {
        const next = Math.min(v, hi - step);
        if (next !== lo) onChange(snap(next, step, min), hi);
      } else {
        const next = Math.max(v, lo + step);
        if (next !== hi) onChange(lo, snap(next, step, min));
      }
    },
    [lo, hi, step, min, onChange]
  );

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (!trackRef.current) return;
    e.preventDefault();
    const rect = trackRef.current.getBoundingClientRect();
    const which = pickThumb(e.clientX, rect);
    draggingRef.current = which;
    const v = clientXToValue(e.clientX, rect, min, max, step);
    setValue(v, which);
    trackRef.current.setPointerCapture(e.pointerId);
  };

  const onTrackPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const v = clientXToValue(e.clientX, rect, min, max, step);
    setValue(v, draggingRef.current);
  };

  const onTrackPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current || !trackRef.current) return;
    draggingRef.current = null;
    if (trackRef.current.hasPointerCapture(e.pointerId)) {
      trackRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const makeKeyHandler = (which: "lo" | "hi") => (e: React.KeyboardEvent) => {
    const big = step * 10;
    let v = which === "lo" ? lo : hi;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        v -= step;
        break;
      case "ArrowRight":
      case "ArrowUp":
        v += step;
        break;
      case "PageDown":
        v -= big;
        break;
      case "PageUp":
        v += big;
        break;
      case "Home":
        v = which === "lo" ? min : lo + step;
        break;
      case "End":
        v = which === "lo" ? hi - step : max;
        break;
      default:
        return;
    }
    e.preventDefault();
    setValue(clamp(v, min, max), which);
  };

  return (
    <div className={`select-none ${className}`}>
      {!hideValues && (
        <div className="flex items-center justify-between mb-1">
          <ValuePill>{format(lo)}</ValuePill>
          <span className="text-gray-300 text-xs">—</span>
          <ValuePill>{format(hi)}</ValuePill>
        </div>
      )}
      <div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerUp}
        onPointerCancel={onTrackPointerUp}
        className="relative h-7 cursor-pointer"
        style={{ touchAction: "none" }}
      >
        <Track loPct={loPct} hiPct={hiPct} />
        <Handle
          pct={loPct}
          active={draggingRef.current === "lo"}
          onPointerDown={(e) => {
            e.stopPropagation();
            onTrackPointerDown(e);
          }}
          onKeyDown={makeKeyHandler("lo")}
          ariaLabel={ariaLabelMin}
          ariaValueNow={lo}
          ariaValueMin={min}
          ariaValueMax={hi}
          ariaValueText={format(lo)}
        />
        <Handle
          pct={hiPct}
          active={draggingRef.current === "hi"}
          onPointerDown={(e) => {
            e.stopPropagation();
            onTrackPointerDown(e);
          }}
          onKeyDown={makeKeyHandler("hi")}
          ariaLabel={ariaLabelMax}
          ariaValueNow={hi}
          ariaValueMin={lo}
          ariaValueMax={max}
          ariaValueText={format(hi)}
        />
      </div>
    </div>
  );
}

/* ------------------------------ SingleRangeSlider ------------------------------ */

interface SingleRangeSliderProps extends SliderShared {
  value: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
  hideValue?: boolean;
}

export function SingleRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  format = (n) => String(n),
  ariaLabel = "Value",
  hideValue = false,
  className = "",
}: SingleRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);

  const v = clamp(value, min, max);
  const pct = pctOf(v, min, max);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const next = clientXToValue(clientX, rect, min, max, step);
      if (next !== v) onChange(next);
    },
    [min, max, step, onChange, v]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!trackRef.current) return;
    e.preventDefault();
    draggingRef.current = true;
    trackRef.current.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!trackRef.current) return;
    draggingRef.current = false;
    if (trackRef.current.hasPointerCapture(e.pointerId)) {
      trackRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    let n = v;
    const big = step * 10;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        n -= step;
        break;
      case "ArrowRight":
      case "ArrowUp":
        n += step;
        break;
      case "PageDown":
        n -= big;
        break;
      case "PageUp":
        n += big;
        break;
      case "Home":
        n = min;
        break;
      case "End":
        n = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(snap(clamp(n, min, max), step, min));
  };

  // Keep arrow-key navigation working even after the user releases the
  // pointer outside the slider element.
  useEffect(() => () => {
    draggingRef.current = false;
  }, []);

  return (
    <div className={`select-none ${className}`}>
      {!hideValue && (
        <div className="flex items-center justify-center mb-1">
          <ValuePill>{format(v)}</ValuePill>
        </div>
      )}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-7 cursor-pointer"
        style={{ touchAction: "none" }}
      >
        <Track loPct={0} hiPct={pct} />
        <div
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuenow={v}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={format(v)}
          onKeyDown={onKeyDown}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-[var(--primary)] shadow-sm cursor-grab active:cursor-grabbing focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20 z-10"
          style={{ left: `${pct}%`, touchAction: "none" }}
        />
      </div>
    </div>
  );
}
