import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { syncFromApi } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endpoint disparado por Vercel Cron (1x/día) o por el admin desde
 * /admin/sync. Auth via `Authorization: Bearer ${CRON_SECRET}` — Vercel
 * inyecta este header automáticamente al llamar al cron.
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
    const result = await syncFromApi();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/sync] failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
