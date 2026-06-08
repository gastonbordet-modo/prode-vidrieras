"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

/**
 * Input numérico controlado con botones +/- en lugar de los spinners
 * nativos del browser. Submitea su `value` via `name` cuando el form
 * que lo contiene se envía.
 */
export function NumberStepper({
  name,
  defaultValue,
  min = 0,
  max = 20,
  ariaLabel,
}: {
  name: string;
  defaultValue: number | null;
  min?: number;
  max?: number;
  ariaLabel: string;
}) {
  const [value, setValue] = useState<string>(
    defaultValue !== null ? String(defaultValue) : "",
  );

  const numeric = value === "" ? null : Number(value);
  const canDec = numeric !== null && numeric > min;
  const canInc = numeric === null || numeric < max;

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  const handleDec = () => {
    if (numeric === null) return;
    setValue(String(clamp(numeric - 1)));
  };
  const handleInc = () => {
    setValue(String(clamp(numeric === null ? min : numeric + 1)));
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
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        required
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/\D/g, "");
          if (cleaned === "") {
            setValue("");
          } else {
            setValue(String(clamp(Number(cleaned))));
          }
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
