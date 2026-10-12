import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TicketForm } from "./TicketForm";
describe("Abertura de chamado", () => {
  it("bloqueia envio sem local e descrição", async () => {
    const onSubmit = vi.fn();
    render(<TicketForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Enviar chamado" }));
    expect(await screen.findByText("Informe o local.")).toBeInTheDocument();
    expect(screen.getByText("Descreva o problema.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it("envia os valores selecionados e remove espaços externos", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Local da ocorrência"), {
      target: { value: "  Lab 1  " },
    });
    fireEvent.change(screen.getByLabelText("Descrição do problema"), {
      target: { value: "  Vazamento no teto.  " },
    });
    fireEvent.click(screen.getByLabelText("Hidráulica"));
    fireEvent.change(screen.getByLabelText("Urgência"), {
      target: { value: "URGENTE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar chamado" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      location: "Lab 1",
      description: "Vazamento no teto.",
      type: "HIDRAULICA",
      urgency: "URGENTE",
    });
  });
});
