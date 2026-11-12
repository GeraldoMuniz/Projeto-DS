import { describe, expect, it } from "vitest";
import { buildAnalyticsSeries } from "./analytics-series";
import type { Ticket } from "./maintenance.types";

const now = new Date("2026-11-12T15:00:00Z");
const defaults = {
  start: "2026-11-09",
  end: "2026-11-12",
  groupBy: "day" as const,
  now,
};

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

describe("Séries temporais dos chamados selecionados", () => {
  it("separa resultados de conclusão e fecha no mesmo dia sem criar pendências", () => {
    const tickets = ["SUCESSO", "SEM_SUCESSO", null].map((outcome, index) =>
      ticket({
        id: index,
        status: "CONCLUIDO",
        outcome: outcome as Ticket["outcome"],
        closedAt: "2026-11-09T14:00:00Z",
      }),
    );
    const result = buildAnalyticsSeries(tickets, defaults);
    expect(result.points[0]).toEqual({
      date: "2026-11-09",
      opened: 3,
      success: 1,
      failure: 1,
      unknown: 1,
      pending: 0,
    });
    expect(result.points.every((point) => point.pending === 0)).toBe(true);
  });

  it("conta eventos nas datas reais, preenche intervalos vazios e acumula pendências", () => {
    const result = buildAnalyticsSeries(
      [
        ticket({
          status: "CONCLUIDO",
          outcome: "SUCESSO",
          closedAt: "2026-11-10T12:00:00Z",
        }),
        ticket({ id: 2, createdAt: "2026-11-11T12:00:00Z" }),
      ],
      defaults,
    );
    expect(result).toEqual({
      start: "2026-11-09",
      end: "2026-11-12",
      excluded: 0,
      tooLong: false,
      points: [
        {
          date: "2026-11-09",
          opened: 1,
          success: 0,
          failure: 0,
          unknown: 0,
          pending: 1,
        },
        {
          date: "2026-11-10",
          opened: 0,
          success: 1,
          failure: 0,
          unknown: 0,
          pending: 0,
        },
        {
          date: "2026-11-11",
          opened: 1,
          success: 0,
          failure: 0,
          unknown: 0,
          pending: 1,
        },
        {
          date: "2026-11-12",
          opened: 0,
          success: 0,
          failure: 0,
          unknown: 0,
          pending: 1,
        },
      ],
    });
  });

  it("usa as fronteiras inclusivas do dia de Recife para aberturas e conclusões", () => {
    const result = buildAnalyticsSeries(
      [
        ticket({
          createdAt: "2026-11-09T02:59:59Z",
          status: "CONCLUIDO",
          outcome: "SUCESSO",
          closedAt: "2026-11-09T03:00:00Z",
        }),
        ticket({ id: 2, createdAt: "2026-11-09T03:00:00Z" }),
      ],
      { ...defaults, start: "2026-11-08", end: "2026-11-09" },
    );
    expect(
      result.points.map(({ date, opened, success, pending }) => ({
        date,
        opened,
        success,
        pending,
      })),
    ).toEqual([
      { date: "2026-11-08", opened: 1, success: 0, pending: 1 },
      { date: "2026-11-09", opened: 1, success: 1, pending: 1 },
    ]);
  });

  it("exclui completamente conclusões sem data confiável e não inventa seus resultados", () => {
    const result = buildAnalyticsSeries(
      [
        ticket({ status: "CONCLUIDO", outcome: "SUCESSO" }),
        ticket({ status: "CONCLUIDO", closedAt: "inválida" }),
        ticket({ status: "CONCLUIDO", closedAt: "2026-11-08T12:00:00Z" }),
        ticket({ status: "CONCLUIDO", closedAt: "2026-11-13T12:00:00Z" }),
        ticket({ createdAt: "" }),
        ticket({ createdAt: "2026-11-13T12:00:00Z" }),
        ticket({
          status: "CONCLUIDO",
          outcome: null,
          closedAt: "2026-11-10T12:00:00Z",
        }),
      ],
      defaults,
    );
    expect(result.excluded).toBe(6);
    expect(result.points.reduce((sum, p) => sum + p.opened, 0)).toBe(1);
    expect(result.points.reduce((sum, p) => sum + p.unknown, 0)).toBe(1);
    expect(
      result.points.reduce((sum, p) => sum + p.success + p.failure, 0),
    ).toBe(0);
    expect(result.points.at(-1)?.pending).toBe(0);
  });

  it("mantém pendente no passado um chamado concluído depois do fim do recorte", () => {
    const result = buildAnalyticsSeries(
      [
        ticket({
          status: "CONCLUIDO",
          outcome: "SEM_SUCESSO",
          closedAt: "2026-11-11T12:00:00Z",
        }),
      ],
      { ...defaults, end: "2026-11-10" },
    );
    expect(result.points.map((p) => p.pending)).toEqual([1, 1]);
    expect(result.points.reduce((sum, p) => sum + p.failure, 0)).toBe(0);
    expect(result.excluded).toBe(0);
  });

  it("inclui retornos e os demais estados abertos, sem usar datas de conclusão residuais", () => {
    const tickets = [
      "TRIAGEM",
      "ACOMPANHAMENTO",
      "EM_ANALISE",
      "EM_ANDAMENTO",
      "RETORNADO",
    ].map((status, index) =>
      ticket({
        id: index,
        status: status as Ticket["status"],
        closedAt: "2026-11-10T12:00:00Z",
      }),
    );
    const result = buildAnalyticsSeries(tickets, defaults);
    expect(result.points[0].opened).toBe(5);
    expect(result.points.map((p) => p.pending)).toEqual([5, 5, 5, 5]);
    expect(result.excluded).toBe(0);
  });

  it("agrupa semanas na segunda-feira e meses no dia 1, com primeira faixa parcial", () => {
    const weekly = buildAnalyticsSeries([], {
      ...defaults,
      start: "2026-10-28",
      end: "2026-11-12",
      groupBy: "week",
    });
    expect(weekly.points.map((p) => p.date)).toEqual([
      "2026-10-28",
      "2026-11-02",
      "2026-11-09",
    ]);
    const monthly = buildAnalyticsSeries(
      [
        ticket({
          createdAt: "2026-10-28T12:00:00Z",
          status: "CONCLUIDO",
          outcome: "SEM_SUCESSO",
          closedAt: "2026-11-01T12:00:00Z",
        }),
      ],
      { ...defaults, start: "2026-10-28", groupBy: "month" },
    );
    expect(
      monthly.points.map(({ date, opened, failure, pending }) => ({
        date,
        opened,
        failure,
        pending,
      })),
    ).toEqual([
      { date: "2026-10-28", opened: 1, failure: 0, pending: 1 },
      { date: "2026-11-01", opened: 0, failure: 1, pending: 0 },
    ]);
  });

  it("mede o saldo anterior ao início e limita o fim ao instante atual", () => {
    const result = buildAnalyticsSeries(
      [
        ticket({ createdAt: "2026-11-07T12:00:00Z" }),
        ticket({
          createdAt: "2026-11-08T12:00:00Z",
          status: "CONCLUIDO",
          outcome: "SUCESSO",
          closedAt: "2026-11-09T03:00:00Z",
        }),
      ],
      { ...defaults, end: "2026-12-01" },
    );
    expect(result.end).toBe("2026-11-12");
    expect(result.points[0]).toMatchObject({
      opened: 0,
      success: 1,
      pending: 1,
    });
    expect(result.points.at(-1)?.pending).toBe(1);
  });

  it("define a faixa automática por dados elegíveis e preenche a base vazia com zero", () => {
    const automatic = buildAnalyticsSeries(
      [
        ticket({ createdAt: "2026-11-10T12:00:00Z" }),
        ticket({ createdAt: "2020-01-01T12:00:00Z", status: "CONCLUIDO" }),
      ],
      { ...defaults, start: "", end: "" },
    );
    expect(automatic.start).toBe("2026-11-10");
    expect(automatic.excluded).toBe(1);
    expect(automatic.points).toHaveLength(3);
    expect(
      buildAnalyticsSeries([], { ...defaults, start: "", end: "" }).points,
    ).toEqual([
      {
        date: "2026-11-12",
        opened: 0,
        success: 0,
        failure: 0,
        unknown: 0,
        pending: 0,
      },
    ]);
  });

  it("não desenha faixas invertidas, futuras ou datas de calendário inválidas", () => {
    expect(
      buildAnalyticsSeries([], { ...defaults, start: "2026-11-13" }).points,
    ).toEqual([]);
    expect(
      buildAnalyticsSeries([], {
        ...defaults,
        start: "2026-11-11",
        end: "2026-11-10",
      }).points,
    ).toEqual([]);
    expect(
      buildAnalyticsSeries([], { ...defaults, start: "2026-02-30" }).points,
    ).toEqual([]);
    expect(
      buildAnalyticsSeries([], { ...defaults, end: "inválida" }).points,
    ).toEqual([]);
  });

  it("limita a série a 366 faixas sem percorrer todos os dias de uma faixa enorme", () => {
    const allowed = buildAnalyticsSeries([], {
      ...defaults,
      start: "2025-11-12",
    });
    expect(allowed.points).toHaveLength(366);
    expect(allowed.tooLong).toBe(false);
    const tooLong = buildAnalyticsSeries([], {
      ...defaults,
      start: "0001-01-01",
    });
    expect(tooLong.points).toEqual([]);
    expect(tooLong.tooLong).toBe(true);
    expect(
      buildAnalyticsSeries([], {
        ...defaults,
        start: "2025-01-01",
        groupBy: "month",
      }).tooLong,
    ).toBe(false);
  });
});
