import type { RankingRow } from "@/lib/ranking";
import type { Tag } from "@/lib/tags";
import { TagChips } from "@/components/tag-chip";

export function RankingTable({
  rows,
  currentUserId,
  emptyMessage,
  tagsByUser,
}: {
  rows: RankingRow[];
  currentUserId: string;
  emptyMessage?: string;
  tagsByUser?: Map<string, Tag[]>;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-text-gray py-6 text-center text-sm">
        {emptyMessage ?? "Sin datos para mostrar."}
      </p>
    );
  }

  return (
    <div className="bg-background-container border-opacity-white-12 overflow-x-auto rounded-md border">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="text-text-gray border-opacity-white-12 border-b text-left text-xs uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2 text-right">Pos</th>
            <th className="px-3 py-2">Nickname</th>
            <th className="px-3 py-2 text-right">Pts</th>
            <th className="px-3 py-2 text-right">Exactos</th>
          </tr>
        </thead>
        <tbody className="text-text-light">
          {rows.map((r, i) => {
            const isMe = r.userId === currentUserId;
            return (
              <tr
                key={r.userId}
                className={
                  "border-opacity-white-12 border-b last:border-b-0 " +
                  (isMe ? "bg-default-20" : "")
                }
              >
                <td className="text-text-gray px-3 py-2 text-right font-mono">
                  {i + 1}
                </td>
                <td className="text-text-dark px-3 py-2 font-semibold">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span>{r.nickname}</span>
                    {isMe && (
                      <span className="text-text-gray text-xs font-normal">
                        (vos)
                      </span>
                    )}
                    {tagsByUser && (
                      <TagChips tags={tagsByUser.get(r.userId) ?? []} />
                    )}
                  </span>
                </td>
                <td className="text-text-dark px-3 py-2 text-right font-semibold">
                  {r.points}
                </td>
                <td className="px-3 py-2 text-right">{r.exacts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
