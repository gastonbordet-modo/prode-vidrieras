import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

const connectionString = env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to use the Drizzle client.");
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
