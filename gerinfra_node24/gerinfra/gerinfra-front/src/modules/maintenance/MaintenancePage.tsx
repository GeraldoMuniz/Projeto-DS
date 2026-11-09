import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { toast } from "@cincoders/cinnamon";
import { Wrench, Search } from "lucide-react";
import { useAuthorization } from "../../hooks/useAuthorization";
import { TicketForm } from "./components/TicketForm";
import { ManagerBoard, TeamBoard, TicketList } from "./components/TicketBoard";
import { TicketDetail } from "./components/TicketDetail";
import { ManagerAnalytics } from "./components/ManagerAnalytics";
import { PeriodicPanel, RequestsPanel } from "./components/PeriodicPanel";
import { DataState, PageHeading, RefreshButton } from "./components/Common";
import { useTickets } from "./useTickets";
import { ticketService } from "./ticket.service";
import {
  TEAM_LABELS,
  STATUS_LABELS,
  type Profile,
  type Ticket,
  type Urgency,
  type Team,
} from "./maintenance.types";

export default function MaintenancePage({ profile }: { profile: Profile }) {
  const auth = useAuth();
  const { roles } = useAuthorization();
  const teamSlug = roles
    .find((role) => role.startsWith("sys_gerinfra-team-"))
    ?.replace("sys_gerinfra-team-", "");
  const teamCode = (
    {
      eletrica: "ELETRICA",
      hidraulica: "HIDRAULICA",
      refrigeracao: "REFRIGERACAO",
      "ti-rede": "TI_REDE",
      mobiliario: "MOBILIARIO",
    } as Record<string, Team>
  )[teamSlug ?? ""];
  const { data: tickets, isLoading, error, reload } = useTickets();
  const [tab, setTab] = useState(profile === "solicitante" ? "novo" : "painel");
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const tabs =
    profile === "solicitante"
      ? [
          ["novo", "Novo chamado"],
          ["historico", "Meus chamados & retornos"],
        ]
      : [
          [
            "painel",
            profile === "gestor" ? "Painel de gestão" : "Fila de atendimento",
          ],
          ...(profile === "gestor"
            ? [
                ["graficos", "Gráficos e indicadores"],
                ["retornos", "Retornos das equipes"],
              ]
            : [["historico", "Concluídos"]]),
          ["periodicas", "Manutenções periódicas"],
          ["solicitacoes", "Solicitações de periódicas"],
        ];
  const visible = (tickets ?? []).filter(
    (t) =>
      (!search ||
        `${t.id} ${t.title} ${t.location} ${t.team ? TEAM_LABELS[t.team] : ""}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (status === "all" || t.status === status),
  );
  const list =
    tab === "retornos"
      ? visible.filter((t) => t.status === "RETORNADO")
      : profile === "equipe" && tab === "historico"
        ? visible.filter((t) => t.status === "CONCLUIDO")
        : visible;
  const title =
    profile === "gestor"
      ? "Gestão de manutenções"
      : profile === "equipe"
        ? `Equipe de ${teamCode ? TEAM_LABELS[teamCode] : "manutenção"}`
        : "Olá, " +
          (auth.user?.profile.given_name ??
            auth.user?.profile.preferred_username ??
            "solicitante");
  async function move(ticket: Ticket, urgency: Urgency) {
    if (busy) return;
    setBusy(true);
    try {
      await ticketService.action(ticket.id, {
        action: "PRIORITY",
        urgency,
        version: ticket.version,
      });
      toast.success("Prioridade atualizada.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível mover o chamado.",
      );
    } finally {
      setBusy(false);
      reload();
    }
  }
  const ticketTab = ![
    "novo",
    "periodicas",
    "solicitacoes",
    "graficos",
  ].includes(tab);
  return (
    <div className="gerinfra-app">
      <div className="brand-strip">
        <Wrench size={17} />
        <span>GERINFRA CIn-UFPE</span>
        <span className="brand-caption">Gestão de manutenção predial</span>
      </div>
      <PageHeading
        title={title}
        description={
          profile === "solicitante"
            ? "Abra uma solicitação e acompanhe cada etapa do atendimento."
            : "Organize os serviços e acompanhe o cuidado com a infraestrutura do CIn."
        }
      />
      <nav className="tabs" aria-label="Seções do Gerinfra">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setTab(value);
              setStatus("all");
            }}
            className={tab === value ? "active" : ""}
            aria-current={tab === value ? "page" : undefined}
          >
            {label}
            {value === "retornos" && (
              <span className="tab-count">
                {tickets?.filter((t) => t.status === "RETORNADO").length ?? 0}
              </span>
            )}
          </button>
        ))}
      </nav>
      {tab === "novo" && (
        <TicketForm
          onSubmit={async (dto) => {
            try {
              await ticketService.create(dto);
              toast.success("Chamado enviado à Gerinfra.");
              reload();
              setTab("historico");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Não foi possível enviar o chamado.",
              );
            }
          }}
        />
      )}
      {tab === "periodicas" && (
        <PeriodicPanel
          profile={profile}
          onTicketCreated={(id) => {
            reload();
            setSelected(id);
          }}
        />
      )}
      {tab === "solicitacoes" && <RequestsPanel profile={profile} />}
      {profile === "gestor" && tab === "graficos" && (
        <DataState
          loading={isLoading}
          error={error}
          empty={false}
          reload={reload}
        >
          <ManagerAnalytics
            tickets={tickets ?? []}
            onOpen={(ticket) => setSelected(ticket.id)}
            reload={reload}
            refreshing={isLoading}
          />
        </DataState>
      )}
      {ticketTab && (
        <>
          {profile === "gestor" && tab === "painel" && (
            <div className="stats-grid">
              {[
                [
                  "Em triagem",
                  tickets?.filter((t) => t.status === "TRIAGEM").length ?? 0,
                ],
                [
                  "Em acompanhamento",
                  tickets?.filter(
                    (t) => !["TRIAGEM", "CONCLUIDO"].includes(t.status),
                  ).length ?? 0,
                ],
                [
                  "Concluídos",
                  tickets?.filter((t) => t.status === "CONCLUIDO").length ?? 0,
                ],
                [
                  "Retornados",
                  tickets?.filter((t) => t.status === "RETORNADO").length ?? 0,
                ],
              ].map(([label, count]) => (
                <div className="stat-card" key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="filter-bar">
            <label className="search-box">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número, título, local ou equipe…"
                aria-label="Buscar chamados"
              />
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos os estados</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <RefreshButton onClick={reload} disabled={busy || isLoading} />
          </div>
          <DataState
            loading={isLoading}
            error={error}
            empty={!list.length}
            reload={reload}
          >
            {tab === "painel" && profile === "gestor" ? (
              <ManagerBoard tickets={list} onOpen={(t) => setSelected(t.id)} />
            ) : tab === "painel" && profile === "equipe" ? (
              <TeamBoard
                tickets={list}
                onOpen={(t) => setSelected(t.id)}
                onMove={move}
                disabled={busy}
              />
            ) : (
              <TicketList tickets={list} onOpen={(t) => setSelected(t.id)} />
            )}
          </DataState>
        </>
      )}
      {selected !== null && (
        <TicketDetail
          key={selected}
          id={selected}
          profile={profile}
          onClose={() => setSelected(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
