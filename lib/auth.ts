import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { users, type users as usersTable } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

type DbUser = typeof usersTable.$inferSelect;

/**
 * Garantiza que haya un usuario autenticado Y con perfil completo en la DB.
 * Redirige a /login si no está autenticado, a /onboarding si está autenticado
 * pero no completó el setup.
 */
export async function requireUser(): Promise<{
  authUserId: string;
  user: DbUser;
}> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
  });

  if (!user) redirect("/onboarding");

  return { authUserId: authUser.id, user };
}

/**
 * Igual que requireUser pero además exige role='admin'. Si no, 404
 * (no redirect: no queremos exponer la existencia de /admin).
 */
export async function requireAdmin(): Promise<{
  authUserId: string;
  user: DbUser;
}> {
  const ctx = await requireUser();
  if (ctx.user.role !== "admin") notFound();
  return ctx;
}
