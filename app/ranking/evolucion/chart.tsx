"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvolutionSeries } from "@/lib/ranking";

/**
 * Paleta para hasta 10 usuarios. Si crece, los excedentes vuelven al inicio.
 * Usa los tokens del YOY donde tenga sentido (default, accent, success, etc).
 */
const COLORS = [
  "#ff155d", // default
  "#00d8fc", // accent
  "#02fca4", // system-success-dark
  "#ffc200", // system-warning-dark
  "#3cab6d", // green-light
  "#2375ff", // blue-light
  "#ffa985", // orange-light
  "#ff7dc6", // yellow-default
  "#ad9bcb", // text-gray
  "#f9f4f9", // text-light
];

type ChartRow = { round: number; name: string } & Record<string, number | string>;

export function EvolutionChart({ series }: { series: EvolutionSeries[] }) {
  if (series.length === 0 || series[0]?.data.length === 0) {
    return (
      <p className="text-text-gray py-8 text-center text-sm">
        Todavía no hay fechas jugadas para graficar.
      </p>
    );
  }

  // Recharts espera filas con una clave por línea: [{ name: "Fecha 1", ana: 12, ben: 7 }, …]
  const data: ChartRow[] = series[0].data.map((point, i) => {
    const row: ChartRow = { round: point.round, name: point.name };
    for (const s of series) {
      row[s.nickname] = s.data[i]?.points ?? 0;
    }
    return row;
  });

  return (
    <div className="bg-background-container border-opacity-white-12 rounded-md border p-4">
      <ResponsiveContainer width="100%" height={360}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
        >
          <CartesianGrid stroke="#ffffff1f" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            stroke="#ad9bcb"
            tick={{ fill: "#ad9bcb", fontSize: 11 }}
          />
          <YAxis
            stroke="#ad9bcb"
            tick={{ fill: "#ad9bcb", fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#36224b",
              border: "1px solid #ffffff1f",
              borderRadius: 8,
              color: "#ffffff",
            }}
            labelStyle={{ color: "#ad9bcb" }}
          />
          <Legend wrapperStyle={{ color: "#f9f4f9", fontSize: 12 }} />
          {series.map((s, i) => (
            <Line
              key={s.userId}
              type="monotone"
              dataKey={s.nickname}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
