import { asc, eq, gt, max } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { chatMessages, users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type ChatMessagesResponse = {
  messages: Array<{
    id: number;
    userId: string;
    nickname: string;
    text: string;
    createdAt: string;
  }>;
  /**
   * `true` cuando el cliente envió un `since` mayor al max id actual
   * del server (síntoma de que el cron limpió el chat entre polls).
   * El cliente debe descartar su estado local y reemplazarlo con
   * `messages` (la lista completa post-limpieza).
   */
  truncated: boolean;
};

/**
 * Polling endpoint. El cliente manda el id más alto que tiene en local
 * y recibe solo los mensajes posteriores. Si el cursor del cliente
 * quedó por delante del server (truncate), devolvemos la lista
 * completa con `truncated: true` para que resincronice.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sinceParam = request.nextUrl.searchParams.get("since");
  const since = sinceParam ? Math.max(0, Number(sinceParam) | 0) : 0;

  const [maxRow] = await db
    .select({ maxId: max(chatMessages.id) })
    .from(chatMessages);
  const maxId = maxRow?.maxId ?? 0;

  const truncated = since > maxId;
  const lowerBound = truncated ? 0 : since;

  const rows = await db
    .select({
      id: chatMessages.id,
      userId: chatMessages.userId,
      nickname: users.nickname,
      text: chatMessages.text,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.userId))
    .where(gt(chatMessages.id, lowerBound))
    .orderBy(asc(chatMessages.createdAt));

  const body: ChatMessagesResponse = {
    truncated,
    messages: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      nickname: r.nickname,
      text: r.text,
      createdAt: r.createdAt.toISOString(),
    })),
  };

  return NextResponse.json(body);
}
