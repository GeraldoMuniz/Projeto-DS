import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Frame, Text } from "@cincoders/cinnamon";
import { Send } from "lucide-react";
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
  function selecionarImagem(arquivo: File | null) {
    if (!arquivo) {
      setImagem(null);
      setErroImagem("");
    } else if (!TIPOS_IMAGEM.includes(arquivo.type)) {
      setImagem(null);
      setErroImagem("Selecione uma imagem JPG, PNG, WebP ou GIF.");
    } else if (arquivo.size === 0 || arquivo.size > LIMITE_IMAGEM) {
      setImagem(null);
      setErroImagem("A imagem precisa ter até 5 MB e não pode estar vazia.");
    } else {
      setImagem(arquivo);
      setErroImagem("");
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
            onChange={(event) => selecionarImagem(event.target.files?.[0] ?? null)}
          />
          <p className="muted" id="ajuda-imagem">JPG, PNG, WebP ou GIF. Até 5 MB.</p>
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
        <button className="button primary" disabled={isSubmitting || Boolean(erroImagem)}>
          <Send size={16} />
          {isSubmitting ? "Enviando…" : "Enviar chamado"}
        </button>
      </form>
    </Frame>
  );
}
