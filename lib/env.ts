import { z } from "zod";

/**
 * Trata strings vacíos como `undefined` para que un placeholder en
 * `.env.local` (ej. `FOOTBALL_DATA_TOKEN=`) no rompa la validación de
 * un campo opcional.
 */
const optionalSecret = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  DATABASE_URL: optionalSecret,
  FOOTBALL_DATA_TOKEN: optionalSecret,
  CRON_SECRET: optionalSecret,
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  // Local usa DATABASE_URL (manualmente seteado). En Vercel el Supabase
  // Marketplace inyecta POSTGRES_URL (pooler en port 6543) — perfecto
  // para serverless con `prepare: false`.
  DATABASE_URL: process.env.DATABASE_URL ?? process.env.POSTGRES_URL,
  FOOTBALL_DATA_TOKEN: process.env.FOOTBALL_DATA_TOKEN,
  CRON_SECRET: process.env.CRON_SECRET,
});
