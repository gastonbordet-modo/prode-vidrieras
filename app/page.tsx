import { requireUser } from "@/lib/auth";
import { signOut } from "./actions";

export default async function HomePage() {
  const { user } = await requireUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="text-text-gray">
          Hola,{" "}
          <strong className="text-text-dark font-semibold">
            {user.nickname}
          </strong>
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-system-links text-sm underline-offset-4 hover:underline"
          >
            Salir
          </button>
        </form>
      </header>

      <section className="space-y-4 text-center">
        <h1 className="text-default text-3xl font-semibold">Prode Vidrieras</h1>
        <p className="text-text-gray">
          Mundial 2026. Las predicciones llegan en la próxima fase.
        </p>
      </section>
    </main>
  );
}
