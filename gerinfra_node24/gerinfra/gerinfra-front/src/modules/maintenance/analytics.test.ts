import { describe, expect, it } from "vitest";
import {
  EMPTY_ANALYTICS_FILTERS,
  filterAnalyticsTickets,
  reportDateKey,
  summarizeTickets,
} from "./analytics";
import type { Ticket } from "./maintenance.types";

function ticket(fields: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    title: "Manutenção",
    location: "Lab 1",
    type: "ELETRICA",
    urgency: "MODERADO",
    status: "ACOMPANHAMENTO",
    description: "Reparo",
    team: "ELETRICA",
    feedback: null,
    returnReason: null,
    version: 0,
    createdAt: "2026-11-09T12:00:00Z",
    requesterName: "Pessoa",
    periodicId: null,
    ...fields,
  };
}

describe("Indicadores de chamados", () => {
  it("separa abertos, retornos, resultados explícitos e conclusões antigas", () => {
    const tickets = [
      ticket({ status: "RETORNADO", urgency: "URGENTE" }),
      ticket(),
      ticket({ status: "CONCLUIDO", outcome: "SUCESSO" }),
      ticket({ status: "CONCLUIDO", outcome: "SEM_SUCESSO" }),
      ticket({ status: "CONCLUIDO", outcome: null, urgency: "URGENTE" }),
    ];
    expect(summarizeTickets(tickets)).toEqual({
      total: 5,
      open: 2,
      success: 1,
      failure: 1,
      unknown: 1,
      support: 1,
      urgent: 1,
      rate: 50,
    });
  });
  it("não calcula taxa sem conclusões classificadas e nunca usa retornos como falhas", () => {
    expect(summarizeTickets([])).toMatchObject({ total: 0, rate: null });
    expect(
      summarizeTickets([
        ticket({ status: "RETORNADO" }),
        ticket({ status: "CONCLUIDO" }),
      ]),
    ).toMatchObject({
      open: 1,
      support: 1,
      failure: 0,
      unknown: 1,
      rate: null,
    });
  });
  it("usa o dia de Recife nas duas bordas inclusivas do período", () => {
    const tickets = [
      ticket({ id: 1, createdAt: "2026-11-09T02:59:59Z" }),
      ticket({ id: 2, createdAt: "2026-11-09T03:00:00Z" }),
      ticket({ id: 3, createdAt: "2026-11-10T02:59:59Z" }),
      ticket({ id: 4, createdAt: "2026-11-10T03:00:00Z" }),
    ];
    expect(reportDateKey(tickets[0].createdAt)).toBe("2026-11-08");
    expect(
      filterAnalyticsTickets(tickets, {
        ...EMPTY_ANALYTICS_FILTERS,
        start: "2026-11-09",
        end: "2026-11-09",
      }).map((t) => t.id),
    ).toEqual([2, 3]);
  });
  it("combina equipe e resultado sem classificar chamados abertos como conclusões", () => {
    const tickets = [
      ticket({ id: 1, status: "CONCLUIDO", outcome: "SUCESSO" }),
      ticket({
        id: 2,
        status: "CONCLUIDO",
        outcome: "SUCESSO",
        team: "HIDRAULICA",
      }),
      ticket({ id: 3, outcome: "SUCESSO" }),
    ];
    expect(
      filterAnalyticsTickets(tickets, {
        ...EMPTY_ANALYTICS_FILTERS,
        team: "ELETRICA",
        outcome: "SUCESSO",
      }).map((t) => t.id),
    ).toEqual([1]);
  });
  it("permite filtrar não alocados, abertos e resultados não informados", () => {
    const tickets = [
      ticket({ id: 1, team: null }),
      ticket({ id: 2, status: "CONCLUIDO", outcome: null }),
      ticket({ id: 3, status: "CONCLUIDO", outcome: "SEM_SUCESSO" }),
    ];
    expect(
      filterAnalyticsTickets(tickets, {
        ...EMPTY_ANALYTICS_FILTERS,
        team: "unassigned",
        outcome: "open",
      }).map((t) => t.id),
    ).toEqual([1]);
    expect(
      filterAnalyticsTickets(tickets, {
        ...EMPTY_ANALYTICS_FILTERS,
        outcome: "unknown",
      }).map((t) => t.id),
    ).toEqual([2]);
  });
  it("bloqueia período invertido e não inventa datas ausentes", () => {
    const tickets = [ticket({ createdAt: "" })];
    expect(
      filterAnalyticsTickets(tickets, EMPTY_ANALYTICS_FILTERS),
    ).toHaveLength(1);
    expect(
      filterAnalyticsTickets(tickets, {
        ...EMPTY_ANALYTICS_FILTERS,
        start: "2026-11-09",
      }),
    ).toEqual([]);
    expect(
      filterAnalyticsTickets([ticket()], {
        ...EMPTY_ANALYTICS_FILTERS,
        start: "2026-11-10",
        end: "2026-11-09",
      }),
    ).toEqual([]);
  });
});
