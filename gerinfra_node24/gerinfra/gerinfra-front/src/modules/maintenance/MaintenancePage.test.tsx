import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ticket } from "./maintenance.types";
import MaintenancePage from "./MaintenancePage";

const mocks = vi.hoisted(() => ({ useTickets: vi.fn(), reload: vi.fn() }));
vi.mock("./useTickets", () => ({ useTickets: mocks.useTickets }));
vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { profile: { given_name: "Pessoa" } } }),
}));
vi.mock("../../hooks/useAuthorization", () => ({
  useAuthorization: () => ({ roles: ["sys_gerinfra-admin", "sys_gerinfra-team-eletrica"] }),
}));
vi.mock("@cincoders/cinnamon", () => ({
  Text: ({ children }: { children: ReactNode }) => <>{children}</>,
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("./components/TicketForm", () => ({ TicketForm: () => <div>Novo chamado</div> }));
vi.mock("./components/TicketBoard", () => ({
  ManagerBoard: () => <div>Quadro do gestor</div>,
  TeamBoard: () => <div>Quadro da equipe</div>,
  TicketList: () => <div>Lista de chamados</div>,
}));
vi.mock("./components/TicketDetail", () => ({ TicketDetail: () => <div>Detalhes</div> }));
vi.mock("./components/PeriodicPanel", () => ({
  PeriodicPanel: () => <div>Periódicas</div>,
  RequestsPanel: () => <div>Solicitações</div>,
}));

const ticket: Ticket = {
  id: 1, title: "Lâmpada", location: "Lab 1", type: "ELETRICA", urgency: "MODERADO",
  status: "EM_ANDAMENTO", description: "Lâmpada apagada.", team: "ELETRICA",
  feedback: null, returnReason: null, version: 1, createdAt: "2026-11-02T12:00:00Z",
  requesterName: "Pessoa", periodicId: null,
};

describe("Acesso e dados da aba de gráficos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useTickets.mockReturnValue({ data: [ticket], isLoading: false, error: null, reload: mocks.reload });
  });

  it("oferece gráficos ao gestor", () => {
    render(<MaintenancePage profile="gestor" />);
    fireEvent.click(screen.getByRole("button", { name: "Gráficos e indicadores" }));
    expect(screen.getByRole("heading", { name: "Gráficos e indicadores" })).toBeInTheDocument();
    expect(document.querySelector('[data-metric="total"] strong')).toHaveTextContent("1");
  });

  it.each(["solicitante", "equipe"] as const)("não oferece gráficos ao perfil %s", (profile) => {
    render(<MaintenancePage profile={profile} />);
    expect(screen.queryByRole("button", { name: "Gráficos e indicadores" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Imprimir / Salvar PDF" })).not.toBeInTheDocument();
  });

  it("não apresenta zero nem habilita impressão enquanto os dados carregam", () => {
    mocks.useTickets.mockReturnValue({ data: undefined, isLoading: true, error: null, reload: mocks.reload });
    render(<MaintenancePage profile="gestor" />);
    fireEvent.click(screen.getByRole("button", { name: "Gráficos e indicadores" }));
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    expect(document.querySelector("[data-metric]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Imprimir / Salvar PDF" })).not.toBeInTheDocument();
  });

  it("mostra erro e permite nova tentativa sem tratar falha como zero chamados", () => {
    mocks.useTickets.mockReturnValue({ data: [ticket], isLoading: false, error: new Error("Falha ao carregar chamados."), reload: mocks.reload });
    render(<MaintenancePage profile="gestor" />);
    fireEvent.click(screen.getByRole("button", { name: "Gráficos e indicadores" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao carregar chamados.");
    expect(document.querySelector("[data-metric]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Imprimir / Salvar PDF" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.reload).toHaveBeenCalledOnce();
  });

  it("usa todos os dados mesmo após busca e filtro no quadro de chamados", () => {
    render(<MaintenancePage profile="gestor" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar chamados" }), { target: { value: "sem correspondência" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por estado" }), { target: { value: "CONCLUIDO" } });
    expect(screen.getByText("Nenhum registro por aqui.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gráficos e indicadores" }));
    expect(document.querySelector('[data-metric="total"] strong')).toHaveTextContent("1");
    expect(screen.getByRole("table")).toHaveTextContent("#1 · Lâmpada");
  });
});
