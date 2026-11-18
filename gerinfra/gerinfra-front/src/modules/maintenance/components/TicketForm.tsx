import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Frame, Text } from "@cincoders/cinnamon";
import { Camera, Send } from "lucide-react";
import {
  TEAMS,
  TEAM_LABELS,
  URGENCIES,
  URGENCY_LABELS,
  type CreateTicket,
} from "../maintenance.types";
const LIMITE_IMAGEM = 5 * 1024 * 1024;
const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const schema = z.object({
  location: z.string().trim().min(1, "Informe o local.").max(200),
  type: z.enum(TEAMS),
  urgency: z.enum(URGENCIES),
  description: z.string().trim().min(1, "Descreva o problema.").max(5000),
});
export function TicketForm({
  onSubmit,
}: {
  onSubmit: (data: CreateTicket & { imagem?: File }) => Promise<void>;
}) {
  const inputImagem = useRef<HTMLInputElement>(null);
  const [imagem, setImagem] = useState<File | null>(null);
  const [erroImagem, setErroImagem] = useState("");
  const [previsaoImagem, setPrevisaoImagem] = useState<string | null>(null);
  const urlImagem = useRef<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const fluxoCamera = useRef<MediaStream | null>(null);
  const pedidoCamera = useRef(0);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [abrindoCamera, setAbrindoCamera] = useState(false);
  const [capturandoFoto, setCapturandoFoto] = useState(false);
  const [erroCamera, setErroCamera] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicket>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "ELETRICA",
      urgency: "MODERADO",
      location: "",
      description: "",
    },
  });
  // A câmera só fica ativa enquanto o usuário estiver preparando a foto.
  useEffect(() => {
    return () => {
      pedidoCamera.current += 1;
      fluxoCamera.current?.getTracks().forEach((faixa) => faixa.stop());
      fluxoCamera.current = null;
      if (urlImagem.current && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(urlImagem.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cameraAberta && video.current) {
      video.current.srcObject = fluxoCamera.current;
    }
    return () => {
      if (video.current) video.current.srcObject = null;
    };
  }, [cameraAberta]);

  function selecionarImagem(arquivo: File | null): boolean {
    if (urlImagem.current && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(urlImagem.current);
    }
    urlImagem.current = null;
    setPrevisaoImagem(null);
    setImagem(null);

    if (!arquivo) {
      setErroImagem("");
      return true;
    }
    if (!TIPOS_IMAGEM.includes(arquivo.type)) {
      setErroImagem("Selecione uma imagem JPG, PNG, WebP ou GIF.");
      return false;
    }
    if (arquivo.size === 0 || arquivo.size > LIMITE_IMAGEM) {
      setErroImagem("A imagem precisa ter até 5 MB e não pode estar vazia.");
      return false;
    }
    if (typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(arquivo);
      urlImagem.current = url;
      setPrevisaoImagem(url);
    }
    setImagem(arquivo);
    setErroImagem("");
    return true;
  }

  function fecharCamera() {
    pedidoCamera.current += 1;
    fluxoCamera.current?.getTracks().forEach((faixa) => faixa.stop());
    fluxoCamera.current = null;
    if (video.current) video.current.srcObject = null;
    setCameraAberta(false);
    setAbrindoCamera(false);
    setCapturandoFoto(false);
  }

  async function abrirCamera() {
    if (cameraAberta || abrindoCamera) return;
    setErroCamera("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setErroCamera("Câmera indisponível. Use HTTPS ou localhost e confira as permissões do navegador.");
      return;
    }
    const idPedido = ++pedidoCamera.current;
    setAbrindoCamera(true);
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (idPedido !== pedidoCamera.current) {
        fluxo.getTracks().forEach((faixa) => faixa.stop());
        return;
      }
      fluxoCamera.current = fluxo;
      setCameraAberta(true);
    } catch (erro) {
      if (idPedido !== pedidoCamera.current) return;
      const motivo = erro instanceof Error ? erro.name : "";
      setErroCamera(
        motivo === "NotAllowedError" || motivo === "PermissionDeniedError"
          ? "Permissão para usar a câmera negada. Libere o acesso no navegador ou escolha uma imagem."
          : "Não foi possível abrir a câmera. Confira a conexão, as permissões ou escolha uma imagem.",
      );
    } finally {
      if (idPedido === pedidoCamera.current) setAbrindoCamera(false);
    }
  }

  function tirarFoto() {
    const imagemVideo = video.current;
    if (!imagemVideo?.videoWidth || !imagemVideo.videoHeight) {
      setErroCamera("Aguarde a câmera carregar a imagem antes de fotografar.");
      return;
    }

    const tela = document.createElement("canvas");
    // Reduz fotos muito grandes, mantendo boa resolução e respeitando 5 MB.
    const escala = Math.min(1, 1920 / imagemVideo.videoWidth, 1920 / imagemVideo.videoHeight);
    tela.width = Math.max(1, Math.round(imagemVideo.videoWidth * escala));
    tela.height = Math.max(1, Math.round(imagemVideo.videoHeight * escala));
    const contexto = tela.getContext("2d");
    if (!contexto) {
      setErroCamera("Não foi possível preparar a foto neste navegador.");
      return;
    }
    contexto.drawImage(imagemVideo, 0, 0, tela.width, tela.height);
    setCapturandoFoto(true);
    setErroCamera("");
    const idPedido = pedidoCamera.current;
    try {
      tela.toBlob(
        (dados) => {
          if (idPedido !== pedidoCamera.current) return;
          setCapturandoFoto(false);
          if (!dados) {
            setErroCamera("Não foi possível capturar a foto. Tente novamente.");
            return;
          }
          const arquivo = new File([dados], `chamado-${Date.now()}.jpg`, { type: "image/jpeg" });
          if (selecionarImagem(arquivo)) {
            if (inputImagem.current) inputImagem.current.value = "";
            fecharCamera();
          }
        },
        "image/jpeg",
        0.85,
      );
    } catch {
      setCapturandoFoto(false);
      setErroCamera("Não foi possível capturar a foto. Tente novamente.");
    }
  }

  return (
    <Frame className="ticket-form panel">
      <Text as="h2" variant="headline">
        Registrar novo chamado
      </Text>
      <p className="muted">
        Conte o que aconteceu. A Gerinfra vai encaminhar para a equipe
        responsável.
      </p>
      <form
        onSubmit={handleSubmit((dados) => onSubmit(imagem ? { ...dados, imagem } : dados))}
        className="stack"
      >
        <label>
          Local da ocorrência
          <input
            {...register("location")}
            placeholder="Ex.: Lab Graduação 1"
            maxLength={200}
          />
          {errors.location && (
            <span className="field-error">{errors.location.message}</span>
          )}
        </label>
        <fieldset>
          <legend>Tipo de manutenção</legend>
          <div className="specialties">
            {TEAMS.map((team) => (
              <label key={team} className="specialty">
                <input type="radio" value={team} {...register("type")} />
                <span>{TEAM_LABELS[team]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Urgência
          <select {...register("urgency")}>
            {URGENCIES.map((value) => (
              <option key={value} value={value}>
                {URGENCY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Descrição do problema
          <textarea
            {...register("description")}
            rows={5}
            maxLength={5000}
            placeholder="Descreva o problema e os detalhes que podem ajudar no atendimento…"
          />
          {errors.description && (
            <span className="field-error">{errors.description.message}</span>
          )}
        </label>
        <div className="stack">
          <label htmlFor="imagem-chamado">Imagem do problema (opcional)</label>
          <input
            id="imagem-chamado"
            ref={inputImagem}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-describedby="ajuda-imagem"
            onChange={(event) => {
              selecionarImagem(event.target.files?.[0] ?? null);
              if (cameraAberta || abrindoCamera) fecharCamera();
            }}
          />
          <p className="muted" id="ajuda-imagem">
            Escolha uma imagem ou tire uma foto com a câmera. JPG, PNG, WebP ou GIF. Até 5 MB.
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={isSubmitting || abrindoCamera || cameraAberta}
            onClick={() => void abrirCamera()}
          >
            <Camera size={16} />
            {abrindoCamera ? "Abrindo câmera…" : "Abrir câmera para tirar foto"}
          </button>
          {cameraAberta && (
            <div className="stack">
              <video
                ref={video}
                autoPlay
                muted
                playsInline
                aria-label="Visualização ao vivo da câmera"
                style={{ display: "block", maxWidth: "100%", width: 420, borderRadius: 8 }}
              />
              <div className="button-row">
                <button
                  type="button"
                  className="button primary"
                  disabled={capturandoFoto || isSubmitting}
                  onClick={tirarFoto}
                >
                  <Camera size={16} />
                  {capturandoFoto ? "Capturando…" : "Tirar foto"}
                </button>
                <button type="button" className="button secondary" onClick={fecharCamera}>
                  Cancelar câmera
                </button>
              </div>
            </div>
          )}
          {erroCamera && <span role="alert" className="field-error">{erroCamera}</span>}
          {previsaoImagem && (
            <img
              src={previsaoImagem}
              alt="Pré-visualização da imagem anexada"
              style={{ display: "block", maxWidth: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 8 }}
            />
          )}
          {imagem && (
            <div>
              <span>Imagem selecionada: {imagem.name}</span>{" "}
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  selecionarImagem(null);
                  if (inputImagem.current) inputImagem.current.value = "";
                }}
              >
                Remover imagem
              </button>
            </div>
          )}
          {erroImagem && <span role="alert" className="field-error">{erroImagem}</span>}
        </div>
        <button className="button primary" disabled={isSubmitting || Boolean(erroImagem) || cameraAberta || capturandoFoto}>
          <Send size={16} />
          {isSubmitting ? "Enviando…" : "Enviar chamado"}
        </button>
      </form>
    </Frame>
  );
}
