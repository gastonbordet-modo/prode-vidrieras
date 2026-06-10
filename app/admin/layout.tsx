import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-default text-xl font-bold">Admin</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/admin/users"
            className="text-text-light hover:text-default"
          >
            Usuarios
          </Link>
          <Link
            href="/admin/sync"
            className="text-text-light hover:text-default"
          >
            Sync
          </Link>
          <Link
            href="/"
            className="text-text-gray hover:text-text-light underline-offset-4 hover:underline"
          >
            Volver
          </Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
