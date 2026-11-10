import { reportDateKey } from "./analytics";
import type { Ticket } from "./maintenance.types";

export type ChartGrouping = "day" | "week" | "month";

export interface SeriesPoint {
  date: string;
  opened: number;
  success: number;
  failure: number;
  unknown: number;
  pending: number;
}

interface SeriesOptions {
  start: string;
  end: string;
  groupBy: ChartGrouping;
  now?: Date;
}

interface DatedTicket {
  opened: string;
  closed: string | null;
  outcome: Ticket["outcome"];
}

const MAX_POINTS = 366;

function validCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** The first bucket may be partial; following weeks start Monday and months on day 1. */
function nextBucket(value: string, grouping: ChartGrouping) {
  const date = new Date(`${value}T00:00:00Z`);
  if (grouping === "month") {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
  } else {
    const days = grouping === "week" ? (8 - date.getUTCDay()) % 7 || 7 : 1;
    date.setUTCDate(date.getUTCDate() + days);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Event dates for the selected opening-date cohort, never an inferred status history.
 * A completed ticket without a trustworthy closure date is excluded from all curves,
 * including pending, so missing history cannot appear as a perpetual open ticket.
 */
export function buildAnalyticsSeries(
  tickets: Ticket[],
  options: SeriesOptions,
) {
  const now = options.now ?? new Date();
  const timestamp = now.getTime();
  const today = Number.isFinite(timestamp)
    ? reportDateKey(now.toISOString())
    : "";
  const dated: DatedTicket[] = [];
  let excluded = 0;

  for (const ticket of tickets) {
    const openedAt = new Date(ticket.createdAt).getTime();
    const closed = ticket.status === "CONCLUIDO";
    const closedAt = ticket.closedAt
      ? new Date(ticket.closedAt).getTime()
      : Number.NaN;
    if (
      !Number.isFinite(openedAt) ||
      openedAt > timestamp ||
      (closed &&
        (!Number.isFinite(closedAt) ||
          closedAt < openedAt ||
          closedAt > timestamp))
    ) {
      excluded += 1;
      continue;
    }
    dated.push({
      opened: reportDateKey(ticket.createdAt),
      closed: closed ? reportDateKey(new Date(closedAt).toISOString()) : null,
      outcome: ticket.outcome,
    });
  }

  if (
    !today ||
    (options.start && !validCalendarDate(options.start)) ||
    (options.end && !validCalendarDate(options.end))
  )
    return {
      points: [] as SeriesPoint[],
      start: "",
      end: "",
      excluded,
      tooLong: false,
    };

  const earliest = dated.reduce(
    (first, ticket) => (ticket.opened < first ? ticket.opened : first),
    today,
  );
  const start = options.start || earliest;
  const end = options.end && options.end < today ? options.end : today;
  const points: SeriesPoint[] = [];
  for (
    let date = start;
    date <= end;
    date = nextBucket(date, options.groupBy)
  ) {
    if (points.length === MAX_POINTS)
      return { points: [], start, end, excluded, tooLong: true };
    points.push({
      date,
      opened: 0,
      success: 0,
      failure: 0,
      unknown: 0,
      pending: 0,
    });
  }

  // Each event is assigned once; bucket count is bounded even for a very long range.
  function pointAt(date: string) {
    if (date < start || date > end || !points.length) return undefined;
    let low = 0;
    let high = points.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (points[middle].date <= date) low = middle;
      else high = middle - 1;
    }
    return points[low];
  }

  let pending = 0;
  for (const ticket of dated) {
    if (ticket.opened < start && (!ticket.closed || ticket.closed >= start))
      pending += 1;
    const opened = pointAt(ticket.opened);
    if (opened) opened.opened += 1;
    const closed = ticket.closed ? pointAt(ticket.closed) : undefined;
    if (closed) {
      if (ticket.outcome === "SUCESSO") closed.success += 1;
      else if (ticket.outcome === "SEM_SUCESSO") closed.failure += 1;
      else closed.unknown += 1;
    }
  }
  for (const point of points) {
    pending += point.opened - point.success - point.failure - point.unknown;
    point.pending = pending;
  }
  return { points, start, end, excluded, tooLong: false };
}
