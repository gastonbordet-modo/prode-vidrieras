"use client";

import { useActionState } from "react";
import { setNickname, type OnboardingState } from "./actions";

const initialState: OnboardingState = null;

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    setNickname,
    initialState,
  );

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-text-gray text-sm">Nickname</span>
          <input
            name="nickname"
            type="text"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_\-]+"
            autoComplete="off"
            placeholder="elcrack"
            className="border-opacity-white-12 bg-background-container text-text-dark focus:border-default rounded-md border px-4 py-3 outline-none"
          />
          <span className="text-text-gray text-xs">
            3 a 20 caracteres. Letras, números, _ y -.
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-button bg-default text-text-button px-6 py-3 font-semibold transition-opacity disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Empezar a jugar"}
        </button>
      </form>

      {state?.error && (
        <p
          role="alert"
          className="bg-system-error-light text-text-light rounded-md px-4 py-3 text-sm"
        >
          {state.error}
        </p>
      )}
    </>
  );
}
