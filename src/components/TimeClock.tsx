"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TimeEntry, UserState, EntryType } from "@/lib/types";
import {
  deriveUserState,
  getValidActions,
  getTotalWorkingSeconds,
  getElapsedSeconds,
  formatDuration,
  formatTime,
} from "@/lib/time-utils";
import { format } from "date-fns";

export default function TimeClock() {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [userState, setUserState] = useState<UserState>("idle");
  const [elapsedDisplay, setElapsedDisplay] = useState("00:00:00");
  const [totalWorkDisplay, setTotalWorkDisplay] = useState("00:00:00");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchEntries = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("reference_date", today)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setEntries(data);
      setUserState(deriveUserState(data));
    }
    setLoading(false);
  }, [today, supabase]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Live timer update
  useEffect(() => {
    if (userState === "idle") {
      setElapsedDisplay("00:00:00");
      return;
    }

    const interval = setInterval(() => {
      const elapsed = getElapsedSeconds(entries);
      setElapsedDisplay(formatDuration(elapsed));

      if (userState === "working") {
        const totalWork = getTotalWorkingSeconds(entries);
        setTotalWorkDisplay(formatDuration(totalWork));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [entries, userState]);

  async function handleAction(entryType: EntryType) {
    setActionLoading(true);
    const { error } = await supabase.rpc("insert_time_entry", {
      p_entry_type: entryType,
    });

    if (!error) {
      await fetchEntries();
    } else {
      console.error("Error inserting time entry:", error);
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="glass-card p-8 sm:p-12 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Cargando estado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-10 animate-fade-in">
      {/* State indicator */}
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div
          className={`pulse-dot ${
            userState === "idle"
              ? "bg-white/30"
              : userState === "working"
              ? "bg-accent-green"
              : "bg-accent-amber"
          }`}
        />
        <span
          className={`text-sm font-semibold uppercase tracking-widest ${
            userState === "idle"
              ? "text-white/40"
              : userState === "working"
              ? "text-accent-green"
              : "text-accent-amber"
          }`}
        >
          {userState === "idle"
            ? "Fuera de turno"
            : userState === "working"
            ? "Trabajando"
            : "En pausa"}
        </span>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-4">
        {userState !== "idle" ? (
          <>
            <div className="timer-display mb-2">{elapsedDisplay}</div>
            <p className="text-white/30 text-xs uppercase tracking-wider">
              {userState === "working"
                ? "Tiempo desde último evento"
                : "Duración de la pausa"}
            </p>
          </>
        ) : (
          <div className="py-6">
            <svg
              className="w-20 h-20 mx-auto text-white/10 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={0.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <p className="text-white/30 text-sm">
              Pulsa el botón para iniciar tu jornada
            </p>
          </div>
        )}
      </div>

      {/* Total worked today (shown when working or on break) */}
      {userState !== "idle" && (
        <div className="text-center mb-8 animate-scale-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
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
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="text-sm text-white/50">Trabajo neto hoy:</span>
            <span className="text-sm font-mono font-semibold text-brand-300">
              {totalWorkDisplay}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {userState === "idle" && (
          <button
            onClick={() => handleAction("clock_in")}
            disabled={actionLoading}
            className="btn-green w-full sm:w-auto disabled:opacity-50"
          >
            {actionLoading ? (
              <LoadingSpinner text="Fichando..." />
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9"
                  />
                </svg>
                Iniciar Jornada
              </span>
            )}
          </button>
        )}

        {userState === "working" && (
          <>
            <button
              onClick={() => handleAction("break_start")}
              disabled={actionLoading}
              className="btn-amber w-full sm:w-auto disabled:opacity-50"
            >
              {actionLoading ? (
                <LoadingSpinner text="Pausando..." />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                    />
                  </svg>
                  Iniciar Pausa
                </span>
              )}
            </button>
            <button
              onClick={() => handleAction("clock_out")}
              disabled={actionLoading}
              className="btn-red w-full sm:w-auto disabled:opacity-50"
            >
              {actionLoading ? (
                <LoadingSpinner text="Finalizando..." />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
                    />
                  </svg>
                  Finalizar Jornada
                </span>
              )}
            </button>
          </>
        )}

        {userState === "on_break" && (
          <button
            onClick={() => handleAction("break_end")}
            disabled={actionLoading}
            className="btn-primary w-full sm:w-auto disabled:opacity-50"
          >
            {actionLoading ? (
              <LoadingSpinner text="Reanudando..." />
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                  />
                </svg>
                Reanudar Trabajo
              </span>
            )}
          </button>
        )}
      </div>

      {/* Today's timeline */}
      {entries.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/[0.06]">
          <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-4">
            Actividad de hoy
          </h3>
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-1.5 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
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
                <span className="text-sm text-white/60 flex-1">
                  {entryLabel(entry.entry_type)}
                </span>
                <span className="text-sm font-mono text-white/40">
                  {formatTime(entry.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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

function LoadingSpinner({ text }: { text: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {text}
    </span>
  );
}
