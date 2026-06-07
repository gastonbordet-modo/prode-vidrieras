import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription ?? error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        exchangeError?.message ?? "No se pudo iniciar sesión",
      )}`,
    );
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, data.user.id),
    columns: { id: true },
  });

  return NextResponse.redirect(`${origin}${existing ? "/" : "/onboarding"}`);
}
