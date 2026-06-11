import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { runClearChatCron } from "@/lib/clear-chat";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Disparado por Vercel Cron (1×/día) o desde /admin/sync. Auth via
 * `Authorization: Bearer ${CRON_SECRET}` — mismo esquema que /cron/sync.
 */
export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET no está configurado en este environment" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runClearChatCron();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/clear-chat] failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
