"use client";

import { Minus, Plus } from "lucide-react";

/**
 * Input numérico controlado con botones +/- en lugar de los spinners
 * nativos del browser. El parent maneja el state y reacciona al onChange
 * (típicamente con debounce para auto-save).
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 20,
  ariaLabel,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  min?: number;
  max?: number;
  ariaLabel: string;
}) {
  const canDec = value !== null && value > min;
  const canInc = value === null || value < max;

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  const handleDec = () => {
    if (value === null) return;
    onChange(clamp(value - 1));
  };
  const handleInc = () => {
    // Primer + sobre un score vacío arranca en 1 (no en min). Así un click
    // sobre el + ya implica "marcó un gol", mientras que el rival queda
    // en 0 por el auto-fill del parent.
    onChange(value === null ? clamp(1) : clamp(value + 1));
  };

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleDec}
        disabled={!canDec}
        aria-label={`Restar ${ariaLabel}`}
        className="bg-opacity-white-12 hover:bg-opacity-white-30 text-text-dark grid h-8 w-8 place-items-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={ariaLabel}
        value={value === null ? "" : String(value)}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/\D/g, "");
          if (cleaned === "") onChange(null);
          else onChange(clamp(Number(cleaned)));
        }}
        className="bg-opacity-white-12 focus:bg-opacity-white-30 text-text-dark h-8 w-10 [appearance:textfield] rounded-md text-center text-base font-semibold tabular-nums transition-colors outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={handleInc}
        disabled={!canInc}
        aria-label={`Sumar ${ariaLabel}`}
        className="bg-opacity-white-12 hover:bg-opacity-white-30 text-text-dark grid h-8 w-8 place-items-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
