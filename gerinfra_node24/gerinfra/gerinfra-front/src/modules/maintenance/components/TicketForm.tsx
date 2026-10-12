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
const schema = z.object({
  location: z.string().trim().min(1, "Informe o local.").max(200),
  type: z.enum(TEAMS),
  urgency: z.enum(URGENCIES),
  description: z.string().trim().min(1, "Descreva o problema.").max(5000),
});
export function TicketForm({
  onSubmit,
}: {
  onSubmit: (data: CreateTicket) => Promise<void>;
}) {
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
  return (
    <Frame className="ticket-form panel">
      <Text as="h2" variant="headline">
        Registrar novo chamado
      </Text>
      <p className="muted">
        Conte o que aconteceu. A Gerinfra vai encaminhar para a equipe
        responsável.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="stack">
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
        <button className="button primary" disabled={isSubmitting}>
          <Send size={16} />
          {isSubmitting ? "Enviando…" : "Enviar chamado"}
        </button>
      </form>
    </Frame>
  );
}
