"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

const initialState: LoginState = null;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    initialState,
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-default text-3xl font-semibold">Prode Vidrieras</h1>
        <p className="text-text-gray">
          Ingresá tu email y te mandamos un link mágico para entrar.
        </p>
      </header>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-text-gray text-sm">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vos@modo.com.ar"
            className="border-opacity-white-12 bg-background-container text-text-dark focus:border-default rounded-md border px-4 py-3 outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-button bg-default text-text-button px-6 py-3 font-semibold transition-opacity disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar link mágico"}
        </button>
      </form>

      {state?.ok && (
        <p
          role="status"
          className="bg-system-success-light text-system-success-dark rounded-md px-4 py-3 text-sm"
        >
          Listo. Revisá tu mail (incluido spam) y clickeá el link.
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
    </main>
  );
}
