"use client";

import { useActionState } from "react";
import { adjustPoints, type AdjustPointsState } from "./actions";

const initialState: AdjustPointsState = null;

export function AdjustForm({
  userId,
  disabled,
}: {
  userId: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    adjustPoints,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />

      <label className="flex flex-col gap-2">
        <span className="text-text-gray text-sm">
          Puntos (positivo o negativo)
        </span>
        <input
          name="points"
          type="number"
          required
          step={1}
          min={-100}
          max={100}
          disabled={disabled}
          className="border-opacity-white-12 bg-background-container text-text-dark focus:border-default rounded-md border px-4 py-3 outline-none disabled:opacity-50"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-text-gray text-sm">Razón</span>
        <textarea
          name="reason"
          required
          minLength={3}
          maxLength={200}
          rows={3}
          disabled={disabled}
          className="border-opacity-white-12 bg-background-container text-text-dark focus:border-default rounded-md border px-4 py-3 outline-none disabled:opacity-50"
        />
      </label>

      <button
        type="submit"
        disabled={pending || disabled}
        className="rounded-button bg-default text-text-button px-6 py-3 font-semibold transition-opacity disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Aplicar ajuste"}
      </button>

      {state?.ok && (
        <p
          role="status"
          className="bg-system-success-light text-system-success-dark rounded-md px-4 py-3 text-sm"
        >
          Ajuste aplicado.
        </p>
      )}
      {state?.error && (
        <p
          role="alert"
          className="bg-system-error-light text-text-light rounded-md px-4 py-3 text-sm"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
