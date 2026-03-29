"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface HoursChartProps {
  data: { day: string; hours: number; date: string }[];
}

export default function HoursChart({ data }: HoursChartProps) {
  const maxHours = Math.max(...data.map((d) => d.hours), 1);

  return (
    <div className="glass-card p-5 sm:p-6 animate-slide-up">
      <h3 className="text-sm font-semibold text-white/70 mb-6 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-brand-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
          />
        </svg>
        Horas trabajadas — Últimos 7 días
      </h3>
      <div className="h-[220px] sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}h`}
              domain={[0, Math.ceil(maxHours + 1)]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="glass-card px-4 py-3 !rounded-xl text-sm">
                      <p className="text-white/50 text-xs mb-1">{d.date}</p>
                      <p className="text-white font-semibold">
                        {d.hours.toFixed(1)} horas
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.hours > 0
                      ? `rgba(99, 102, 241, ${0.4 + (entry.hours / maxHours) * 0.6})`
                      : "rgba(255,255,255,0.04)"
                  }
                  stroke={
                    entry.hours > 0
                      ? "rgba(99, 102, 241, 0.3)"
                      : "rgba(255,255,255,0.06)"
                  }
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
