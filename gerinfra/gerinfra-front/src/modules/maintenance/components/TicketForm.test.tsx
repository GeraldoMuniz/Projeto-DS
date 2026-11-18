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

  it("abre e fecha a câmera liberando o dispositivo", async () => {
    const parar = vi.fn();
    const obterCamera = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: parar }],
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: obterCamera },
    });
    const { unmount } = render(<TicketForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir câmera para tirar foto" }));
    expect(await screen.findByLabelText("Visualização ao vivo da câmera")).toBeInTheDocument();
    expect(obterCamera).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar câmera" }));
    expect(parar).toHaveBeenCalledOnce();
    unmount();
    vi.restoreAllMocks();
  });

  it("captura a fotografia da câmera e envia no mesmo campo de imagem", async () => {
    const parar = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: parar }] }) },
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:foto-do-chamado"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const desenhar = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: desenhar,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["foto"], { type: "image/jpeg" }));
    });
    const enviar = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm onSubmit={enviar} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir câmera para tirar foto" }));
    const video = await screen.findByLabelText("Visualização ao vivo da câmera");
    Object.defineProperty(video, "videoWidth", { configurable: true, value: 1280 });
    Object.defineProperty(video, "videoHeight", { configurable: true, value: 720 });
    fireEvent.click(screen.getByRole("button", { name: "Tirar foto" }));
    expect(await screen.findByRole("img", { name: "Pré-visualização da imagem anexada" }))
      .toHaveAttribute("src", "blob:foto-do-chamado");
    expect(parar).toHaveBeenCalledOnce();
    expect(desenhar).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Local da ocorrência"), {
      target: { value: "Sala 201" },
    });
    fireEvent.change(screen.getByLabelText("Descrição do problema"), {
      target: { value: "Foto do vazamento" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar chamado" }));
    await waitFor(() => expect(enviar).toHaveBeenCalledOnce());
    const anexo = enviar.mock.calls[0][0].imagem as File;
    expect(anexo).toBeInstanceOf(File);
    expect(anexo.type).toBe("image/jpeg");
    expect(anexo.name).toMatch(/^chamado-.*\.jpg$/);
    vi.restoreAllMocks();
  });

  it("mostra erro de permissão sem impedir o cadastro sem foto", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(
        Object.assign(new Error("Sem permissão"), { name: "NotAllowedError" }),
      ) },
    });
    render(<TicketForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir câmera para tirar foto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Permissão para usar a câmera negada");
    expect(screen.getByRole("button", { name: "Enviar chamado" })).toBeEnabled();
  });

});
