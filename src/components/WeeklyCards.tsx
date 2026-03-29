"use client";

import { formatMinutes } from "@/lib/time-utils";

interface WeeklyCardsProps {
  totalNetMinutes: number;
  totalBreakMinutes: number;
  daysWorked: number;
}

export default function WeeklyCards({
  totalNetMinutes,
  totalBreakMinutes,
  daysWorked,
}: WeeklyCardsProps) {
  const cards = [
    {
      label: "Horas esta semana",
      value: formatMinutes(totalNetMinutes),
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
      color: "text-brand-400",
      bg: "bg-brand-500/10",
      border: "border-brand-500/20",
    },
    {
      label: "Pausas acumuladas",
      value: formatMinutes(totalBreakMinutes),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 5.25v13.5m-7.5-13.5v13.5"
          />
        </svg>
      ),
      color: "text-accent-amber",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "Días trabajados",
      value: `${daysWorked}`,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
          />
        </svg>
      ),
      color: "text-accent-green",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="glass-card-hover p-5 animate-slide-up"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-xl ${card.bg} border ${card.border} ${card.color}`}
            >
              {card.icon}
            </div>
            <span className="text-xs uppercase tracking-widest text-white/40 font-medium">
              {card.label}
            </span>
          </div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
