import Link from "next/link";

export const metadata = {
  title: "404 — Página no encontrada",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <p className="text-default text-7xl font-bold tracking-tight">404</p>
      <div className="space-y-2">
        <h1 className="text-text-dark text-2xl font-semibold">
          Esta página se reprogramó
        </h1>
        <p className="text-text-gray text-sm">
          La URL que buscás no existe (o ya no). Volvé al home y seguimos.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-button bg-default text-text-button px-6 py-3 font-semibold transition-opacity hover:opacity-90"
      >
        Volver al home
      </Link>
    </main>
  );
}
