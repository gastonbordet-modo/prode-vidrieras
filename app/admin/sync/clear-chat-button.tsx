"use client";

import { useActionState } from "react";
import { triggerManualClearChat, type ClearChatState } from "./actions";

const initialState: ClearChatState = null;

export function ClearChatButton() {
  const [state, formAction, pending] = useActionState(
    triggerManualClearChat,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-button bg-default text-text-button self-start px-6 py-3 font-semibold transition-opacity disabled:opacity-60"
      >
        {pending ? "Limpiando…" : "Limpiar chat ahora"}
      </button>

      {state?.ok && state.result && (
        <p
          role="status"
          className="bg-system-success-light text-system-success-dark rounded-md px-4 py-3 text-sm"
        >
          {state.result.cleared ? "Limpiado · " : "Sin cambios · "}
          {state.result.reason}
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
