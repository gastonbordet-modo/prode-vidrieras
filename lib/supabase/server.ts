import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Cliente Supabase para uso en Server Components, Server Actions y Route Handlers.
 * Lee/escribe cookies para mantener la sesión entre requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components no pueden setear cookies. El middleware se
            // encarga de refrescar la sesión cuando hace falta.
          }
        },
      },
    },
  );
}
