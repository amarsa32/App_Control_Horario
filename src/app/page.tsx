"use client";

import Navbar from "@/components/Navbar";
import TimeClock from "@/components/TimeClock";
import WeeklyCards from "@/components/WeeklyCards";
import HoursChart from "@/components/HoursChart";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  groupEntriesByDate,
  getWeeklyChartData,
  getWeeklyTotals,
} from "@/lib/time-utils";
import type { TimeEntry, DaySummary } from "@/lib/types";

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeekData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch last 30 days of entries
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

    fetchWeekData();

    // Refresh data every 60 seconds
    const interval = setInterval(fetchWeekData, 60000);
    return () => clearInterval(interval);
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
            Dashboard
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Gestiona tu jornada laboral
          </p>
        </div>

        {/* TimeClock */}
        <TimeClock />

        {/* Weekly Summary Cards */}
        {!loading && (
          <WeeklyCards
            totalNetMinutes={weeklyTotals.totalNetMinutes}
            totalBreakMinutes={weeklyTotals.totalBreakMinutes}
            daysWorked={weeklyTotals.daysWorked}
          />
        )}

        {/* Weekly Chart */}
        {!loading && <HoursChart data={chartData} />}
      </main>
    </div>
  );
}
