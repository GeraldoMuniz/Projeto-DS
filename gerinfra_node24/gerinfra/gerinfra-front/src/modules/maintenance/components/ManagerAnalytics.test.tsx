import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Ticket } from "../maintenance.types";
import { ManagerAnalytics } from "./ManagerAnalytics";

vi.mock("@cincoders/cinnamon", () => ({
  Text: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const base: Ticket = {
  id: 1, title: "Lâmpada", location: "Lab 1", type: "ELETRICA",
  urgency: "MODERADO", status: "CONCLUIDO", description: "Troca de lâmpada.",
  team: "ELETRICA", feedback: "Substituída.", returnReason: null, version: 1,
  createdAt: "2026-11-02T12:00:00Z", requesterName: "Pessoa", periodicId: null,
  outcome: "SUCESSO", closedAt: "2026-11-03T12:00:00Z",
};
const tickets: Ticket[] = [
  base,
  { ...base, id: 2, title: "Equipamento", team: "REFRIGERACAO", outcome: "SEM_SUCESSO" },
  { ...base, id: 3, title: "Legado", outcome: null, closedAt: null },
  { ...base, id: 4, title: "Vazamento", team: "HIDRAULICA", status: "RETORNADO", outcome: null, closedAt: null, urgency: "URGENTE", returnReason: "Precisa de peça.", createdAt: "2026-11-04T12:00:00Z" },
];

function metric(key: string) {
  return document.querySelector(`[data-metric="${key}"] strong`);
}

function show(data = tickets, refreshing = false) {
  const onOpen = vi.fn();
  const reload = vi.fn();
  const result = render(<ManagerAnalytics tickets={data} onOpen={onOpen} reload={reload} refreshing={refreshing} />);
  return { ...result, onOpen, reload };
}

describe("Gráficos e indicadores do gestor", () => {
  afterEach(() => vi.restoreAllMocks());

  it("combina filtros próprios e restaura o recorte completo ao limpar", () => {
    show();
    expect(metric("total")).toHaveTextContent("4");
    fireEvent.change(screen.getByLabelText("Abertura a partir de"), { target: { value: "2026-11-02" } });
    fireEvent.change(screen.getByLabelText("Abertura até"), { target: { value: "2026-11-03" } });
    expect(metric("total")).toHaveTextContent("3");
    fireEvent.change(screen.getByLabelText("Equipe"), { target: { value: "ELETRICA" } });
    expect(metric("total")).toHaveTextContent("2");
    fireEvent.change(screen.getByLabelText("Resultado"), { target: { value: "SUCESSO" } });
    expect(metric("total")).toHaveTextContent("1");
    const table = within(screen.getByRole("table"));
    expect(table.getByRole("button", { name: "#1 · Lâmpada" })).toBeInTheDocument();
    expect(table.queryByRole("button", { name: "#3 · Legado" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByLabelText("Abertura a partir de")).toHaveValue("");
    expect(screen.getByLabelText("Abertura até")).toHaveValue("");
    expect(screen.getByLabelText("Equipe")).toHaveValue("all");
    expect(screen.getByLabelText("Resultado")).toHaveValue("all");
    expect(metric("total")).toHaveTextContent("4");
  });

  it("bloqueia impressão e omite indicadores quando o período é inválido", () => {
    show();
    fireEvent.change(screen.getByLabelText("Abertura a partir de"), { target: { value: "2026-11-10" } });
    fireEvent.change(screen.getByLabelText("Abertura até"), { target: { value: "2026-11-09" } });
    expect(screen.getByRole("alert")).toHaveTextContent("A data inicial deve ser anterior ou igual à data final.");
    expect(screen.getByLabelText("Abertura a partir de")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Imprimir / Salvar PDF" })).toBeDisabled();
    expect(metric("total")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(metric("total")).toHaveTextContent("4");
  });

  it("mostra zeros e taxa indisponível sem chamados", () => {
    show([]);
    for (const key of ["total", "open", "success", "failure", "support"]) {
      expect(metric(key)).toHaveTextContent("0");
    }
    expect(metric("rate")).toHaveTextContent("—");
    expect(screen.getByRole("status")).toHaveTextContent("Nenhum chamado encontrado");
    expect(screen.getByText(/Sem conclusões com resultado informado para calcular a taxa/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("separa conclusões sem classificação e retornos abertos da taxa de sucesso", () => {
    show();
    expect(metric("rate")).toHaveTextContent("50%");
    expect(metric("open")).toHaveTextContent("1");
    expect(metric("support")).toHaveTextContent("1");
    fireEvent.change(screen.getByLabelText("Resultado"), { target: { value: "unknown" } });
    expect(metric("total")).toHaveTextContent("1");
    expect(metric("success")).toHaveTextContent("0");
    expect(metric("failure")).toHaveTextContent("0");
    expect(metric("rate")).toHaveTextContent("—");
    expect(within(screen.getByRole("table")).getByText("Resultado não informado")).toBeInTheDocument();
  });

  it("abre detalhes, atualiza dados e imprime o relatório atual", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const { onOpen, reload, unmount } = show();
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "#1 · Lâmpada" }));
    expect(onOpen).toHaveBeenCalledWith(base);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar dados" }));
    expect(reload).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Imprimir / Salvar PDF" }));
    expect(print).toHaveBeenCalledOnce();
    expect(document.body).toHaveClass("gerinfra-report-visible");
    unmount();
    expect(document.body).not.toHaveClass("gerinfra-report-visible");
  });

  it("desabilita atualização e impressão enquanto está atualizando", () => {
    show(tickets, true);
    expect(screen.getByRole("button", { name: "Atualizar dados" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Imprimir / Salvar PDF" })).toBeDisabled();
  });
});
