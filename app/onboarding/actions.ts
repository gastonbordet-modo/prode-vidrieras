"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  nickname: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_-]+$/, "Solo letras, números, _ y -"),
});

export type OnboardingState = {
  error?: string;
} | null;

export async function setNickname(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = schema.safeParse({ nickname: formData.get("nickname") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nickname inválido" };
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return { error: "Sesión inválida. Volvé a entrar." };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
    columns: { id: true },
  });
  if (existing) redirect("/");

  const taken = await db.query.users.findFirst({
    where: eq(users.nickname, parsed.data.nickname),
    columns: { id: true },
  });
  if (taken) return { error: "Ese nickname ya está usado, probá otro." };

  await db.insert(users).values({
    id: authUser.id,
    email: authUser.email,
    nickname: parsed.data.nickname,
    role: "user",
  });

  redirect("/");
}
