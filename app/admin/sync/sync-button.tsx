"use client";

import { useActionState } from "react";
import { triggerManualSync, type SyncState } from "./actions";

const initialState: SyncState = null;

export function SyncButton() {
  const [state, formAction, pending] = useActionState(
    triggerManualSync,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-button bg-default text-text-button self-start px-6 py-3 font-semibold transition-opacity disabled:opacity-60"
      >
        {pending ? "Sincronizando…" : "Sync ahora"}
      </button>

      {state?.ok && state.result && (
        <p
          role="status"
          className="bg-system-success-light text-system-success-dark rounded-md px-4 py-3 text-sm"
        >
          Sync OK · {state.result.total} partidos ·{" "}
          {state.result.created} creados · {state.result.updated} actualizados
          · {state.result.reprogrammed} reprogramados
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
