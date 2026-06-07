import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const existing = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { id: true },
  });
  if (existing) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-default text-3xl font-semibold">Bienvenido</h1>
        <p className="text-text-gray">
          Elegí un nickname. Va a ser tu nombre público en el ranking.
        </p>
      </header>
      <OnboardingForm />
    </main>
  );
}
