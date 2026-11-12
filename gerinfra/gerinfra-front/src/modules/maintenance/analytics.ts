import type { Team, Ticket, TicketOutcome } from "./maintenance.types";

export interface AnalyticsFilters {
  start: string;
  end: string;
  team: Team | "all" | "unassigned";
  outcome: TicketOutcome | "all" | "unknown" | "open";
}

export const EMPTY_ANALYTICS_FILTERS: AnalyticsFilters = {
  start: "",
  end: "",
  team: "all",
  outcome: "all",
};

/** Calendar dates match the institution's timezone, including UTC day boundaries. */
export function reportDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function filterAnalyticsTickets(
  tickets: Ticket[],
  filters: AnalyticsFilters,
) {
  if (filters.start && filters.end && filters.start > filters.end) return [];
  return tickets.filter((ticket) => {
    const date = reportDateKey(ticket.createdAt);
    if ((filters.start || filters.end) && !date) return false;
    if (filters.start && date < filters.start) return false;
    if (filters.end && date > filters.end) return false;
    if (filters.team === "unassigned" && ticket.team !== null) return false;
    if (
      filters.team !== "all" &&
      filters.team !== "unassigned" &&
      ticket.team !== filters.team
    )
      return false;
    if (filters.outcome === "open") return ticket.status !== "CONCLUIDO";
    if (filters.outcome === "unknown")
      return ticket.status === "CONCLUIDO" && !ticket.outcome;
    if (filters.outcome !== "all")
      return (
        ticket.status === "CONCLUIDO" && ticket.outcome === filters.outcome
      );
    return true;
  });
}

export function summarizeTickets(tickets: Ticket[]) {
  const closed = tickets.filter((ticket) => ticket.status === "CONCLUIDO");
  const success = closed.filter(
    (ticket) => ticket.outcome === "SUCESSO",
  ).length;
  const failure = closed.filter(
    (ticket) => ticket.outcome === "SEM_SUCESSO",
  ).length;
  const classified = success + failure;
  return {
    total: tickets.length,
    open: tickets.length - closed.length,
    success,
    failure,
    unknown: closed.length - classified,
    support: tickets.filter((ticket) => ticket.status === "RETORNADO").length,
    urgent: tickets.filter(
      (ticket) => ticket.status !== "CONCLUIDO" && ticket.urgency === "URGENTE",
    ).length,
    rate: classified ? (success / classified) * 100 : null,
  };
}
