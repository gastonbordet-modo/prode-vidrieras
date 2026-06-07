import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto:
     * - api/* (las API routes tienen su propia auth, ej. Bearer en /api/cron)
     * - _next/static (assets estáticos)
     * - _next/image (imágenes optimizadas)
     * - favicon.ico
     * - archivos con extensión (svg, png, jpg, etc.)
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
