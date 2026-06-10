"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El digest viene en producción; sirve para correlacionar con logs de Vercel.
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <p className="text-system-error-dark text-5xl font-bold tracking-tight">
        ⚠
      </p>
      <div className="space-y-2">
        <h1 className="text-text-dark text-2xl font-semibold">
          Algo se rompió
        </h1>
        <p className="text-text-gray text-sm">
          Probá de nuevo en un segundo. Si insiste, avisale al admin.
        </p>
        {error.digest && (
          <p className="text-text-gray font-mono text-xs">
            ref: {error.digest}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-button bg-default text-text-button px-6 py-3 font-semibold transition-opacity hover:opacity-90"
      >
        Reintentar
      </button>
    </main>
  );
}
