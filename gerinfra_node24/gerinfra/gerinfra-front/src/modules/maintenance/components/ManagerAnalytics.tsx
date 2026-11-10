import { useEffect, useState } from "react";
import { BarChart3, Printer, CircleHelp } from "lucide-react";
import {
  OUTCOME_LABELS,
  STATUS_LABELS,
  TEAMS,
  TEAM_LABELS,
  type Ticket,
  type TicketStatus,
} from "../maintenance.types";
import {
  EMPTY_ANALYTICS_FILTERS,
  filterAnalyticsTickets,
  summarizeTickets,
  type AnalyticsFilters,
} from "../analytics";
import { formatDate, formatTime } from "../format";
import { RefreshButton } from "./Common";
import { buildAnalyticsSeries, type ChartGrouping } from "../analytics-series";
import { ColumnChart, LineChart } from "./CartesianCharts";
import "./analytics.css";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const STATUS_COLORS: Record<TicketStatus, string> = {
  TRIAGEM: "#b45309",
  ACOMPANHAMENTO: "#2563eb",
  EM_ANALISE: "#7c3aed",
  EM_ANDAMENTO: "#0891b2",
  RETORNADO: "#c2410c",
  CONCLUIDO: "#475569",
};
const STATUS_AXIS_LABELS: Record<TicketStatus, string> = {
  TRIAGEM: "Triagem",
  ACOMPANHAMENTO: "Alocados",
  EM_ANALISE: "Análise",
  EM_ANDAMENTO: "Andamento",
  RETORNADO: "Retornos",
  CONCLUIDO: "Concluídos",
};

export function ManagerAnalytics({
  tickets,
  onOpen,
  reload,
  refreshing = false,
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
  reload: () => void;
  refreshing?: boolean;
}) {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    ...EMPTY_ANALYTICS_FILTERS,
  });
  const [groupBy, setGroupBy] = useState<ChartGrouping>("day");
  useEffect(() => {
    document.body.classList.add("gerinfra-report-visible");
    return () => document.body.classList.remove("gerinfra-report-visible");
  }, []);
  const invalidRange = !!(
    filters.start &&
    filters.end &&
    filters.start > filters.end
  );
  const filtered = filterAnalyticsTickets(tickets, filters);
  const summary = summarizeTickets(filtered);
  const series = buildAnalyticsSeries(filtered, {
    start: filters.start,
    end: filters.end,
    groupBy,
  });
  const support = filtered.filter((ticket) => ticket.status === "RETORNADO");
  const undated = tickets.filter(
    (ticket) =>
      !ticket.createdAt || Number.isNaN(new Date(ticket.createdAt).getTime()),
  ).length;
  function changeFilter<K extends keyof AnalyticsFilters>(
    key: K,
    value: AnalyticsFilters[K],
  ) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  const teamLabel =
    filters.team === "all"
      ? "Todas as equipes"
      : filters.team === "unassigned"
        ? "Sem equipe alocada"
        : TEAM_LABELS[filters.team];
  const outcomeLabel =
    filters.outcome === "all"
      ? "Todos os resultados"
      : filters.outcome === "open"
        ? "Em aberto"
        : filters.outcome === "unknown"
          ? "Conclusão sem resultado informado"
          : OUTCOME_LABELS[filters.outcome];
  const metrics = [
    {
      key: "total",
      label: "Total de chamados",
      value: summary.total,
      note: "No recorte selecionado",
    },
    {
      key: "open",
      label: "Em aberto",
      value: summary.open,
      note: `${summary.urgent} urgente(s) em aberto`,
    },
    {
      key: "success",
      label: "Concluídos com sucesso",
      value: summary.success,
      note: "Problema resolvido",
    },
    {
      key: "failure",
      label: "Concluídos sem sucesso",
      value: summary.failure,
      note: "Encerrados sem resolver o problema",
    },
    {
      key: "support",
      label: "Aguardando apoio",
      value: summary.support,
      note: "Retornos abertos para a gestão",
    },
    {
      key: "rate",
      label: "Taxa de sucesso",
      value: summary.rate === null ? "—" : `${number.format(summary.rate)}%`,
      note: "Entre conclusões com resultado informado",
    },
  ];
  return (
    <section className="manager-report stack" aria-labelledby="analytics-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">GERINFRA · CIn / UFPE</span>
          <h2 id="analytics-title" className="report-title">
            <BarChart3 size={23} /> Gráficos e indicadores
          </h2>
          <p className="muted">
            Resultados dos atendimentos e necessidades de apoio à gestão.
          </p>
        </div>
        <div className="button-row report-no-print">
          <RefreshButton onClick={reload} disabled={refreshing} />
          <button
            className="button primary"
            onClick={() => window.print()}
            disabled={invalidRange || refreshing}
          >
            <Printer size={16} />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>
      <div className="panel report-filters report-no-print">
        <label>
          Abertura a partir de
          <input
            type="date"
            value={filters.start}
            onChange={(e) => changeFilter("start", e.target.value)}
            aria-invalid={invalidRange}
            aria-describedby={invalidRange ? "report-date-error" : undefined}
          />
        </label>
        <label>
          Abertura até
          <input
            type="date"
            value={filters.end}
            onChange={(e) => changeFilter("end", e.target.value)}
            aria-invalid={invalidRange}
            aria-describedby={invalidRange ? "report-date-error" : undefined}
          />
        </label>
        <label>
          Equipe
          <select
            value={filters.team}
            onChange={(e) =>
              changeFilter("team", e.target.value as AnalyticsFilters["team"])
            }
          >
            <option value="all">Todas as equipes</option>
            <option value="unassigned">Sem equipe alocada</option>
            {TEAMS.map((team) => (
              <option key={team} value={team}>
                {TEAM_LABELS[team]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resultado
          <select
            value={filters.outcome}
            onChange={(e) =>
              changeFilter(
                "outcome",
                e.target.value as AnalyticsFilters["outcome"],
              )
            }
          >
            <option value="all">Todos os resultados</option>
            <option value="open">Em aberto</option>
            <option value="SUCESSO">Bem-sucedido</option>
            <option value="SEM_SUCESSO">Sem sucesso</option>
            <option value="unknown">Conclusão sem resultado informado</option>
          </select>
        </label>
        <button
          className="button secondary"
          onClick={() => {
            setFilters({ ...EMPTY_ANALYTICS_FILTERS });
            setGroupBy("day");
          }}
        >
          Limpar filtros
        </button>
      </div>
      {invalidRange ? (
        <p className="notice warning" role="alert" id="report-date-error">
          A data inicial deve ser anterior ou igual à data final.
        </p>
      ) : (
        <>
          <div className="report-context muted">
            <p>
              <strong>Período de abertura:</strong>{" "}
              {filters.start ? formatDate(filters.start) : "Desde o início"} até{" "}
              {filters.end ? formatDate(filters.end) : "a data atual"} ·{" "}
              {teamLabel} · {outcomeLabel}.
            </p>
            <p>
              Emitido em {formatTime(new Date().toISOString())} · Horário de
              Recife. Os cartões e as distribuições mostram a situação atual dos
              chamados abertos no período selecionado.
            </p>
            {undated > 0 && (
              <p>
                {undated} chamado(s) sem data de abertura: incluídos apenas
                quando não há filtro de período.
              </p>
            )}
          </div>
          <div className="report-metrics" aria-live="polite">
            {metrics.map(({ key, label, value, note }) => (
              <div
                className={`stat-card report-metric-${key}`}
                key={key}
                data-metric={key}
              >
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="notice warning" role="status">
              Nenhum chamado encontrado para os filtros selecionados.
            </p>
          )}
          <div className="report-series-controls">
            <div>
              <h3>Evolução dos chamados do recorte</h3>
              <p className="muted">
                Datas no eixo X e quantidade de chamados no eixo Y.
              </p>
            </div>
            <label className="report-no-print">
              Agrupar por
              <select
                value={groupBy}
                onChange={(event) =>
                  setGroupBy(event.target.value as ChartGrouping)
                }
              >
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
              </select>
            </label>
          </div>
          <div className="report-series-note">
            <p>
              <strong>Como ler as linhas:</strong> movimentações de{" "}
              {series.start ? formatDate(series.start) : "—"} a{" "}
              {series.end ? formatDate(series.end) : "—"}, agrupadas por{" "}
              {groupBy === "day"
                ? "dia"
                : groupBy === "week"
                  ? "semana"
                  : "mês"}
              , apenas dos chamados incluídos nos filtros acima. Aberturas usam
              a data de criação; conclusões usam a data registrada de
              encerramento.
            </p>
            <p>
              As pendências são o saldo ao final de cada intervalo. Os cartões
              mostram a situação atual: uma conclusão posterior ao período pode
              aparecer no cartão e ainda estar pendente na linha histórica. O
              dia atual é parcial.
            </p>
            {series.excluded > 0 && (
              <p className="report-support-alert">
                {series.excluded} chamado(s) sem datas válidas de abertura ou
                conclusão ficam fora das séries temporais; continuam nos
                indicadores atuais. Datas ausentes não são estimadas.
              </p>
            )}
            {series.tooLong && (
              <p className="report-support-alert" role="status">
                Há mais de 366 intervalos nas linhas. Escolha um agrupamento
                maior ou reduza o período para visualizar a evolução. Os demais
                indicadores continuam disponíveis.
              </p>
            )}
          </div>
          <div className="report-chart-grid">
            <LineChart
              title="Aberturas e conclusões do recorte"
              description="Aberturas e encerramentos com ou sem sucesso em cada intervalo, considerando as datas registradas dos chamados do recorte."
              points={series.points}
              metrics={[
                { key: "opened", label: "Aberturas", color: "#2563eb" },
                {
                  key: "success",
                  label: "Com sucesso",
                  color: "#15803d",
                  dash: "7 4",
                },
                {
                  key: "failure",
                  label: "Sem sucesso",
                  color: "#b91c1c",
                  dash: "2 4",
                },
                {
                  key: "unknown",
                  label: "Resultado não informado",
                  color: "#64748b",
                  dash: "10 4 2 4",
                },
              ]}
            />
            <LineChart
              title="Pendências do recorte ao longo do tempo"
              description="Chamados do recorte que ainda não tinham sido encerrados ao final de cada intervalo. Retornados permanecem abertos."
              points={series.points}
              metrics={[
                { key: "pending", label: "Pendentes", color: "#7a0016" },
              ]}
            />
            <ColumnChart
              title="Situação dos chamados"
              description={`Distribuição atual dos ${summary.total} chamados do recorte.`}
              xLabel="Situação"
              rows={Object.entries(STATUS_LABELS).map(([status, label]) => ({
                label,
                axisLabel: STATUS_AXIS_LABELS[status as TicketStatus],
                values: [
                  filtered.filter((ticket) => ticket.status === status).length,
                ],
                color: STATUS_COLORS[status as TicketStatus],
              }))}
              metrics={[{ key: "count", label: "Chamados", color: "#7a0016" }]}
            />
            <div className="report-outcomes-chart">
              <ColumnChart
                title="Resultados das conclusões"
                description="Apenas chamados encerrados; retornos continuam em aberto."
                xLabel="Resultado"
                rows={[
                  {
                    label: "Bem-sucedidos",
                    values: [summary.success],
                    color: "#15803d",
                  },
                  {
                    label: "Sem sucesso",
                    values: [summary.failure],
                    color: "#b91c1c",
                  },
                  {
                    label: "Resultado não informado",
                    values: [summary.unknown],
                    color: "#64748b",
                  },
                ]}
                metrics={[
                  { key: "count", label: "Chamados", color: "#64748b" },
                ]}
              />
              <p className="report-explanation muted">
                <CircleHelp size={16} />
                {summary.rate === null
                  ? "Sem conclusões com resultado informado para calcular a taxa."
                  : `Taxa de sucesso: ${summary.success} de ${summary.success + summary.failure} conclusões com resultado informado.`}{" "}
                {summary.unknown} conclusão(ões) sem resultado informado ficam
                fora desse cálculo.
              </p>
            </div>
            <div className="report-team-demand">
              <ColumnChart
                title="Demanda por equipe"
                description="Comparação entre o total de chamados, os que permanecem abertos e os que aguardam apoio. Equipe responsável atual; chamados sem alocação aparecem separadamente."
                xLabel="Equipe"
                rows={[...TEAMS, "unassigned" as const].map((team) => {
                  const items = filtered.filter((ticket) =>
                    team === "unassigned" ? !ticket.team : ticket.team === team,
                  );
                  return {
                    label:
                      team === "unassigned"
                        ? "Sem equipe alocada"
                        : TEAM_LABELS[team],
                    axisLabel:
                      team === "unassigned"
                        ? "Sem equipe"
                        : team === "REFRIGERACAO"
                          ? "Refrig."
                          : TEAM_LABELS[team],
                    values: [
                      items.length,
                      items.filter((ticket) => ticket.status !== "CONCLUIDO")
                        .length,
                      items.filter((ticket) => ticket.status === "RETORNADO")
                        .length,
                    ],
                  };
                })}
                metrics={[
                  { key: "total", label: "Total", color: "#7a0016" },
                  { key: "open", label: "Em aberto", color: "#2563eb" },
                  {
                    key: "support",
                    label: "Aguardando apoio",
                    color: "#c2410c",
                  },
                ]}
              />
            </div>
          </div>
          <section className="panel report-support">
            <h3>Necessidade de apoio</h3>
            <p className={summary.support ? "report-support-alert" : "muted"}>
              {summary.support
                ? `${summary.support} chamado(s) aguardam intervenção da gestão ou apoio externo.`
                : "Nenhum chamado com pedido de apoio registrado neste recorte."}
            </p>
            <p className="muted report-description">
              Critério: chamados devolvidos pela equipe e ainda abertos. A
              ausência de retornos não comprova disponibilidade da equipe.
            </p>
            {support.length > 0 && (
              <ul className="report-support-list">
                {support.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      className="report-ticket-link"
                      onClick={() => onOpen(ticket)}
                    >
                      #{ticket.id} · {ticket.title}
                    </button>
                    <p>
                      {ticket.team
                        ? TEAM_LABELS[ticket.team]
                        : "Sem equipe alocada"}{" "}
                      · {ticket.location}
                    </p>
                    <p>
                      {ticket.returnReason ||
                        "Motivo do retorno não informado."}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel">
            <h3>Todos os chamados do recorte</h3>
            <p className="muted report-description">
              {summary.total} registro(s). Selecione um chamado para consultar
              os detalhes.
            </p>
            <div className="report-table-wrap">
              <table className="report-table">
                <caption className="sr-only">
                  Chamados incluídos nos gráficos e indicadores
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Chamado / Local</th>
                    <th scope="col">Equipe</th>
                    <th scope="col">Abertura</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Conclusão</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <button
                          className="report-ticket-link"
                          onClick={() => onOpen(ticket)}
                        >
                          #{ticket.id} · {ticket.title}
                        </button>
                        <p className="muted">{ticket.location}</p>
                      </td>
                      <td>
                        {ticket.team ? TEAM_LABELS[ticket.team] : "Não alocada"}
                      </td>
                      <td>
                        {ticket.createdAt &&
                        !Number.isNaN(new Date(ticket.createdAt).getTime())
                          ? formatTime(ticket.createdAt)
                          : "Não informada"}
                      </td>
                      <td>{STATUS_LABELS[ticket.status]}</td>
                      <td>
                        {ticket.status === "CONCLUIDO" ? (
                          <>
                            <strong
                              className={
                                ticket.outcome === "SUCESSO"
                                  ? "report-success"
                                  : ticket.outcome === "SEM_SUCESSO"
                                    ? "report-failure"
                                    : ""
                              }
                            >
                              {ticket.outcome
                                ? OUTCOME_LABELS[ticket.outcome]
                                : "Resultado não informado"}
                            </strong>
                            {ticket.closedAt && (
                              <p className="muted">
                                {formatTime(ticket.closedAt)}
                              </p>
                            )}
                            <p className="report-feedback">{ticket.feedback}</p>
                          </>
                        ) : (
                          "Em aberto"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
