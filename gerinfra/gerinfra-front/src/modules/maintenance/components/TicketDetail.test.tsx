import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ticket } from "../maintenance.types";
import { TicketDetail } from "./TicketDetail";

const mocks = vi.hoisted(() => ({
  useTicket: vi.fn(),
  action: vi.fn(),
  reload: vi.fn(),
}));
vi.mock("../useTickets", () => ({ useTicket: mocks.useTicket }));
vi.mock("../ticket.service", () => ({ ticketService: { action: mocks.action } }));
vi.mock("../../../components/auth/Can", () => ({
  Can: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@cincoders/cinnamon", () => ({
  Text: ({ children }: { children: ReactNode }) => <>{children}</>,
  toast: { success: vi.fn(), error: vi.fn() },
}));

const ticket: Ticket = {
  id: 42,
  title: "Lâmpada queimada",
  location: "Lab 1",
  description: "Lâmpada não acende.",
  type: "ELETRICA",
  team: "ELETRICA",
  urgency: "MODERADO",
  status: "EM_ANDAMENTO",
  feedback: null,
  returnReason: null,
  outcome: null,
  closedAt: null,
  version: 3,
  createdAt: "2026-11-01T12:00:00Z",
  requesterName: "Solicitante",
  periodicId: null,
};

function show(profile: "equipe" | "gestor" | "solicitante", changes: Partial<Ticket> = {}) {
  mocks.useTicket.mockReturnValue({
    data: { ...ticket, ...changes },
    isLoading: false,
    error: null,
    reload: mocks.reload,
  });
  const onChanged = vi.fn();
  render(<TicketDetail id={42} profile={profile} onClose={vi.fn()} onChanged={onChanged} />);
  return { onChanged };
}

describe("Resultado da conclusão do chamado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.action.mockResolvedValue({ ...ticket, status: "CONCLUIDO" });
  });

  it("exige resultado explícito e feedback antes de concluir", () => {
    show("equipe");
    const submit = screen.getByRole("button", { name: "Concluir chamado" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Feedback da solução"), { target: { value: "Troca realizada." } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Resultado da conclusão"), { target: { value: "SUCESSO" } });
    expect(submit).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Feedback da solução"), { target: { value: "   " } });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(mocks.action).not.toHaveBeenCalled();
  });

  it("envia resultado e solução da equipe com a versão atual", async () => {
    const { onChanged } = show("equipe");
    fireEvent.change(screen.getByLabelText("Resultado da conclusão"), { target: { value: "SUCESSO" } });
    fireEvent.change(screen.getByLabelText("Feedback da solução"), { target: { value: "  Lâmpada substituída.  " } });
    fireEvent.click(screen.getByRole("button", { name: "Concluir chamado" }));
    await waitFor(() => expect(mocks.action).toHaveBeenCalledWith(42, {
      action: "COMPLETE", outcome: "SUCESSO", text: "Lâmpada substituída.", version: 3,
    }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  });

  it("exige justificativa e registra o encerramento sem sucesso pelo gestor", async () => {
    show("gestor", { status: "RETORNADO", returnReason: "Equipamento sem reparo." });
    const submit = screen.getByRole("button", { name: "Fechar chamado administrativamente" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Resultado da conclusão"), { target: { value: "SEM_SUCESSO" } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Justificativa do encerramento"), { target: { value: "Sem possibilidade de reparo." } });
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.action).toHaveBeenCalledWith(42, {
      action: "CLOSE", outcome: "SEM_SUCESSO", text: "Sem possibilidade de reparo.", version: 3,
    }));
  });

  it("não atribui sucesso a conclusões antigas sem classificação", () => {
    show("solicitante", { status: "CONCLUIDO", outcome: null, feedback: "Fechado administrativamente." });
    const result = screen.getByText("Resultado da conclusão: Não informado");
    expect(result.parentElement).toHaveClass("warning");
    expect(screen.getByText("Fechado administrativamente.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Concluir chamado" })).not.toBeInTheDocument();
  });

  it("mostra conclusão sem sucesso e sua data sem estilo de sucesso", () => {
    show("solicitante", {
      status: "CONCLUIDO", outcome: "SEM_SUCESSO", closedAt: "2026-11-09T12:00:00Z", feedback: "Equipamento irrecuperável.",
    });
    const result = screen.getByText("Resultado da conclusão: Sem sucesso");
    expect(result.parentElement).toHaveClass("warning");
    expect(result.parentElement).not.toHaveClass("success");
    expect(screen.getByText(/Concluído em/)).toBeInTheDocument();
  });
});
