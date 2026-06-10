import type { RankingRow } from "@/lib/ranking";

export function RankingTable({
  rows,
  currentUserId,
  showAdjustments,
  emptyMessage,
}: {
  rows: RankingRow[];
  currentUserId: string;
  showAdjustments?: boolean;
  emptyMessage?: string;
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
            {showAdjustments && (
              <th className="px-3 py-2 text-right">Ajustes</th>
            )}
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
                  {r.nickname}
                  {isMe && (
                    <span className="text-text-gray ml-1 text-xs font-normal">
                      (vos)
                    </span>
                  )}
                </td>
                <td className="text-text-dark px-3 py-2 text-right font-semibold">
                  {r.points}
                </td>
                <td className="px-3 py-2 text-right">{r.exacts}</td>
                {showAdjustments && (
                  <td
                    className={
                      "px-3 py-2 text-right " +
                      (r.adjustments > 0
                        ? "text-system-success-dark"
                        : r.adjustments < 0
                          ? "text-system-error-dark"
                          : "text-text-gray")
                    }
                  >
                    {r.adjustments > 0 ? `+${r.adjustments}` : r.adjustments}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
