import { desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { scoreAdjustments, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { AdjustForm } from "./adjust-form";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdjustUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user: admin } = await requireAdmin();
  const { id } = await params;

  const target = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!target) notFound();

  const adjustments = await db.query.scoreAdjustments.findMany({
    where: eq(scoreAdjustments.userId, id),
    orderBy: [desc(scoreAdjustments.createdAt)],
  });

  const creatorIds = Array.from(new Set(adjustments.map((a) => a.createdBy)));
  const creators =
    creatorIds.length === 0
      ? []
      : await db.query.users.findMany({
          where: inArray(users.id, creatorIds),
          columns: { id: true, nickname: true },
        });
  const creatorById = new Map(creators.map((c) => [c.id, c.nickname]));

  const totalAdjusted = adjustments.reduce((s, a) => s + a.points, 0);
  const isSelf = target.id === admin.id;

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-1">
        <Link
          href="/admin/users"
          className="text-text-gray hover:text-text-light text-xs underline-offset-4 hover:underline"
        >
          ← Usuarios
        </Link>
        <h2 className="text-text-dark text-2xl font-bold">
          Ajustar puntos · {target.nickname}
        </h2>
        <p className="text-text-gray text-sm">{target.email}</p>
      </header>

      {isSelf && (
        <p
          role="alert"
          className="bg-system-error-light text-text-light rounded-md px-4 py-3 text-sm"
        >
          No podés ajustarte puntos a vos mismo.
        </p>
      )}

      <AdjustForm userId={target.id} disabled={isSelf} />

      <section className="flex flex-col gap-3">
        <h3 className="text-text-dark text-lg font-semibold">
          Ajustes previos
        </h3>
        {adjustments.length === 0 ? (
          <p className="text-text-gray text-sm">Sin ajustes todavía.</p>
        ) : (
          <>
            <p className="text-text-gray text-sm">
              Total acumulado:{" "}
              <strong className="text-text-dark font-semibold">
                {totalAdjusted > 0 ? `+${totalAdjusted}` : totalAdjusted} pts
              </strong>
            </p>
            <ul className="flex flex-col gap-2">
              {adjustments.map((a) => (
                <li
                  key={a.id}
                  className="bg-background-container border-opacity-white-12 rounded-md border px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={
                        a.points >= 0
                          ? "text-system-success-dark font-semibold"
                          : "text-system-error-dark font-semibold"
                      }
                    >
                      {a.points > 0 ? `+${a.points}` : a.points} pts
                    </span>
                    <span className="text-text-gray text-xs">
                      {dateFmt.format(a.createdAt)}
                    </span>
                  </div>
                  <p className="text-text-light mt-1">{a.reason}</p>
                  <p className="text-text-gray mt-1 text-xs">
                    por {creatorById.get(a.createdBy) ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </section>
  );
}
