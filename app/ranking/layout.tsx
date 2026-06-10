import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TabsNav } from "./tabs-nav";

export default async function RankingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-default text-xl font-bold">Ranking</h1>
        <Link
          href="/"
          className="text-text-gray hover:text-text-light text-sm underline-offset-4 hover:underline"
        >
          Volver
        </Link>
      </header>
      <TabsNav />
      {children}
    </main>
  );
}
