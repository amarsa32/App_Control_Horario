"use client";

import Navbar from "@/components/Navbar";
import HoursChart from "@/components/HoursChart";
import WeeklyCards from "@/components/WeeklyCards";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  groupEntriesByDate,
  getWeeklyChartData,
  getWeeklyTotals,
  formatDate,
  formatTime,
  formatMinutes,
} from "@/lib/time-utils";
import type { DaySummary, EntryType } from "@/lib/types";

export default function ReportsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("reference_date", fromDate)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setSummaries(groupEntriesByDate(data));
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  const weeklyTotals = getWeeklyTotals(summaries);
  const chartData = getWeeklyChartData(summaries);

  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Page Header */}
        <div className="animate-fade-in">
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Reportes
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Historial y métricas de tu jornada
          </p>
        </div>

        {/* Weekly Cards */}
        {!loading && (
          <WeeklyCards
            totalNetMinutes={weeklyTotals.totalNetMinutes}
            totalBreakMinutes={weeklyTotals.totalBreakMinutes}
            daysWorked={weeklyTotals.daysWorked}
          />
        )}

        {/* Chart */}
        {!loading && <HoursChart data={chartData} />}

        {/* Daily Breakdown Table */}
        {!loading && (
          <div className="glass-card overflow-hidden animate-slide-up">
            <div className="p-5 sm:p-6 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
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
                    d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
                Desglose diario — Últimos 30 días
              </h3>
            </div>

            {summaries.length === 0 ? (
              <div className="p-12 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-white/10 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={0.75}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
                <p className="text-white/30 text-sm">
                  No hay registros en los últimos 30 días
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {summaries.map((summary) => (
                  <div key={summary.date}>
                    {/* Day row */}
                    <button
                      onClick={() =>
                        setExpandedDate(
                          expandedDate === summary.date ? null : summary.date
                        )
                      }
                      className="w-full px-5 sm:px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 capitalize">
                          {formatDate(summary.date)}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/30">
                          {summary.clockIn && (
                            <span>
                              Entrada: {formatTime(summary.clockIn)}
                            </span>
                          )}
                          {summary.clockOut && (
                            <span>
                              Salida: {formatTime(summary.clockOut)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        {summary.breakMinutes > 0 && (
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-white/30">Pausas</p>
                            <p className="text-sm font-mono text-accent-amber">
                              {formatMinutes(summary.breakMinutes)}
                            </p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-xs text-white/30">Neto</p>
                          <p className="text-sm font-mono font-semibold text-accent-green">
                            {formatMinutes(summary.netMinutes)}
                          </p>
                        </div>
                        <svg
                          className={`w-4 h-4 text-white/20 transition-transform duration-200 ${
                            expandedDate === summary.date ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19.5 8.25-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expandedDate === summary.date && (
                      <div className="px-5 sm:px-6 pb-4 animate-scale-in">
                        <div className="bg-white/[0.02] rounded-xl p-4 space-y-2">
                          {summary.entries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center gap-3"
                            >
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  entry.entry_type === "clock_in"
                                    ? "bg-accent-green"
                                    : entry.entry_type === "clock_out"
                                    ? "bg-accent-red"
                                    : entry.entry_type === "break_start"
                                    ? "bg-accent-amber"
                                    : "bg-brand-400"
                                }`}
                              />
                              <span className="text-sm text-white/50 flex-1">
                                {entryLabel(entry.entry_type)}
                              </span>
                              <span className="text-sm font-mono text-white/40">
                                {formatTime(entry.created_at)}
                              </span>
                            </div>
                          ))}

                          {/* Summary row */}
                          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                            <span className="text-xs text-white/30">
                              Resumen del día
                            </span>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-white/40">
                                Bruto:{" "}
                                <span className="font-mono text-white/60">
                                  {formatMinutes(summary.grossMinutes)}
                                </span>
                              </span>
                              <span className="text-white/40">
                                Pausas:{" "}
                                <span className="font-mono text-accent-amber">
                                  {formatMinutes(summary.breakMinutes)}
                                </span>
                              </span>
                              <span className="text-white/40">
                                Neto:{" "}
                                <span className="font-mono font-semibold text-accent-green">
                                  {formatMinutes(summary.netMinutes)}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function entryLabel(type: EntryType): string {
  switch (type) {
    case "clock_in":
      return "Entrada";
    case "clock_out":
      return "Salida";
    case "break_start":
      return "Inicio pausa";
    case "break_end":
      return "Fin pausa";
  }
}
