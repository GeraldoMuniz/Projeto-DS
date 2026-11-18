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
  it("inclui a imagem no formulário ao criar um chamado", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm onSubmit={onSubmit} />);
    const imagem = new File(["imagem"], "problema.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Imagem do problema (opcional)"), { target: { files: [imagem] } });
    fireEvent.change(screen.getByLabelText("Local da ocorrência"), { target: { value: "Sala 101" } });
    fireEvent.change(screen.getByLabelText("Descrição do problema"), { target: { value: "Infiltração no teto" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar chamado" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ imagem })));
  });

  it("recusa imagem acima de 5 MB e formato não permitido", () => {
    render(<TicketForm onSubmit={vi.fn()} />);
    const campo = screen.getByLabelText("Imagem do problema (opcional)");
    fireEvent.change(campo, { target: { files: [new File(["<svg/>"], "figura.svg", { type: "image/svg+xml" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("JPG, PNG, WebP ou GIF");
    expect(screen.getByRole("button", { name: "Enviar chamado" })).toBeDisabled();
    fireEvent.change(campo, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.png", { type: "image/png" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("até 5 MB");
  });

});
