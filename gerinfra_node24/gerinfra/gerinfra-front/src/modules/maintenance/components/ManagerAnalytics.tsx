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

function Bars({
  rows,
  total,
}: {
  rows: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <ul className="report-bars">
      {rows.map(({ label, value, color }) => (
        <li key={label}>
          <div className="report-bar-label">
            <span>{label}</span>
            <strong>
              {value}{" "}
              <small>
                ({number.format(total ? (value / total) * 100 : 0)}%)
              </small>
            </strong>
          </div>
          <div className="report-track" aria-hidden="true">
            <div
              style={{
                width: `${total ? (value / total) * 100 : 0}%`,
                background: color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

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
          onClick={() => setFilters({ ...EMPTY_ANALYTICS_FILTERS })}
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
              Recife. Situação atual dos chamados abertos no período, não um
              histórico de transições.
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
          <div className="report-chart-grid">
            <section className="panel">
              <h3>Situação dos chamados</h3>
              <p className="muted report-description">
                Distribuição dos {summary.total} chamados do recorte.
              </p>
              <Bars
                total={summary.total}
                rows={Object.entries(STATUS_LABELS).map(([status, label]) => ({
                  label,
                  value: filtered.filter((ticket) => ticket.status === status)
                    .length,
                  color: STATUS_COLORS[status as TicketStatus],
                }))}
              />
            </section>
            <section className="panel">
              <h3>Resultados das conclusões</h3>
              <p className="muted report-description">
                Apenas chamados encerrados; retornos continuam em aberto.
              </p>
              <Bars
                total={summary.success + summary.failure + summary.unknown}
                rows={[
                  {
                    label: "Bem-sucedidos",
                    value: summary.success,
                    color: "#15803d",
                  },
                  {
                    label: "Sem sucesso",
                    value: summary.failure,
                    color: "#b91c1c",
                  },
                  {
                    label: "Resultado não informado",
                    value: summary.unknown,
                    color: "#64748b",
                  },
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
            </section>
          </div>
          <section className="panel report-team-demand">
            <h3>Demanda por equipe</h3>
            <p className="muted report-description">
              Volume total por equipe; cada percentual usa o total do recorte.
            </p>
            <Bars
              total={summary.total}
              rows={[...TEAMS, "unassigned" as const].map((team) => ({
                label:
                  team === "unassigned"
                    ? "Sem equipe alocada"
                    : TEAM_LABELS[team],
                value: filtered.filter((ticket) =>
                  team === "unassigned" ? !ticket.team : ticket.team === team,
                ).length,
                color: "#7a0016",
              }))}
            />
          </section>
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
