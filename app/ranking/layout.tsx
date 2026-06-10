import { requireUser } from "@/lib/auth";
import { MainTabs } from "@/components/main-tabs";
import { TabsNav } from "./tabs-nav";

export default async function RankingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 py-6">
      <MainTabs />
      <h1 className="text-default text-xl font-bold">Ranking</h1>
      <TabsNav />
      {children}
    </main>
  );
}
