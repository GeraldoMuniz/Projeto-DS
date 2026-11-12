import { formatDate } from "../format";
import { Dialog } from "@base-ui/react";
import { Frame, Text, toast } from "@cincoders/cinnamon";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Plus, Pencil, Trash2, Zap, X } from "lucide-react";
import { Can } from "../../../components/auth/Can";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { Roles } from "../../../utils/enums";
import { periodicService } from "../periodic.service";
import { periodicRequestService } from "../periodic-request.service";
import { usePeriodic } from "../usePeriodic";
import { usePeriodicRequests } from "../usePeriodicRequests";
import {
  TEAMS,
  TEAM_LABELS,
  type Periodic,
  type PeriodicInput,
  type Profile,
  type RequestInput,
} from "../maintenance.types";
import { DataState, RefreshButton, StatusBadge } from "./Common";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Informe uma data válida.");
const schema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(200),
  location: z.string().trim().min(1, "Informe o local.").max(200),
  date,
  team: z.union([z.enum(TEAMS), z.literal("")]),
});
type Values = z.infer<typeof schema>;
function MaintenanceForm({
  item,
  requestMode = false,
  onClose,
  onSave,
}: {
  item?: Periodic;
  requestMode?: boolean;
  onClose: () => void;
  onSave: (data: PeriodicInput) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: item?.title ?? "",
      location: item?.location ?? "",
      date: item?.date ?? "",
      team: item?.team ?? "",
    },
  });
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Popup className="modal-panel">
          <div className="modal-heading">
            <Dialog.Title className="modal-title">
              {requestMode
                ? "Solicitar manutenção periódica"
                : item
                  ? "Editar manutenção periódica"
                  : "Cadastrar manutenção periódica"}
            </Dialog.Title>
            <Dialog.Close
              className="icon-button"
              disabled={isSubmitting}
              aria-label="Fechar formulário"
            >
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted">
            {requestMode
              ? "A solicitação será enviada à Gerinfra para aprovação."
              : "Defina o serviço, o local e a data programada."}
          </Dialog.Description>
          <form
            className="stack"
            onSubmit={handleSubmit(async (values) => {
              try {
                await onSave({ ...values, team: values.team || null });
                onClose();
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível salvar.",
                );
              }
            })}
          >
            <label>
              Título
              <input {...register("title")} maxLength={200} />
              {errors.title && (
                <span className="field-error">{errors.title.message}</span>
              )}
            </label>
            <label>
              Local
              <input {...register("location")} maxLength={200} />
              {errors.location && (
                <span className="field-error">{errors.location.message}</span>
              )}
            </label>
            <label>
              Data programada
              <input type="date" {...register("date")} />
              {errors.date && (
                <span className="field-error">{errors.date.message}</span>
              )}
            </label>
            {!requestMode && (
              <label>
                Equipe responsável
                <select {...register("team")}>
                  <option value="">Não alocada</option>
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {TEAM_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="button-row">
              <button
                type="button"
                className="button secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={isSubmitting}>
                {isSubmitting
                  ? "Salvando…"
                  : requestMode
                    ? "Enviar solicitação"
                    : "Salvar manutenção"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function PeriodicPanel({
  profile,
  onTicketCreated,
}: {
  profile: Profile;
  onTicketCreated: (id: number) => void;
}) {
  const { data, isLoading, error, reload } = usePeriodic();
  const [form, setForm] = useState<Periodic | "new" | null>(null);
  const [deleting, setDeleting] = useState<Periodic | null>(null);
  const [busy, setBusy] = useState(false);
  async function mutate(fn: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(message);
      reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar a operação.",
      );
      reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="stack">
      <div className="section-heading">
        <Text as="h2" variant="headline">
          {profile === "gestor"
            ? "Manutenções periódicas"
            : "Manutenções atribuídas à minha equipe"}
        </Text>
        <div className="button-row">
          <RefreshButton onClick={reload} disabled={busy} />
          <Can roles={[Roles.ADMIN]}>
            <button
              className="button primary"
              onClick={() => setForm("new")}
              disabled={busy}
            >
              <Plus size={16} />
              Nova manutenção
            </button>
          </Can>
        </div>
      </div>
      <DataState
        loading={isLoading}
        error={error}
        empty={!data?.length}
        reload={reload}
      >
        <div className="periodic-grid">
          {data?.map((item) => (
            <Frame className="panel periodic-card" key={item.id}>
              <div className="section-heading">
                <span className="eyebrow">PERIÓDICA</span>
                <Can roles={[Roles.ADMIN]}>
                  <div className="button-row">
                    <button
                      className="icon-button"
                      aria-label={`Editar ${item.title}`}
                      onClick={() => setForm(item)}
                      disabled={busy}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Excluir ${item.title}`}
                      onClick={() => setDeleting(item)}
                      disabled={busy}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </Can>
              </div>
              <h3>{item.title}</h3>
              <p className="muted">{item.location}</p>
              <div className="periodic-meta">
                <span>
                  <CalendarDays size={15} />
                  {formatDate(item.date)}
                </span>
                <span>
                  {item.team ? TEAM_LABELS[item.team] : "Não alocada"}
                </span>
              </div>
              <Can roles={[Roles.ADMIN]}>
                <button
                  className="button primary full"
                  disabled={busy}
                  onClick={() =>
                    void mutate(async () => {
                      const ticket = await periodicService.generate(item);
                      onTicketCreated(ticket.id);
                    }, "Chamado periódico gerado.")
                  }
                >
                  <Zap size={16} />
                  Gerar chamado agora
                </button>
              </Can>
            </Frame>
          ))}
        </div>
      </DataState>
      {form && (
        <MaintenanceForm
          item={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
          onSave={async (dto) => {
            await periodicService.save(dto, form === "new" ? undefined : form);
            toast.success("Manutenção salva.");
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Excluir manutenção periódica"
        description={`Excluir “${deleting?.title}”? Os chamados já gerados serão preservados.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const item = deleting;
          setDeleting(null);
          if (item)
            void mutate(
              () => periodicService.remove(item),
              "Manutenção excluída.",
            );
        }}
      />
    </section>
  );
}
export function RequestsPanel({ profile }: { profile: Profile }) {
  const { data, isLoading, error, reload } = usePeriodicRequests();
  const [form, setForm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function decide(id: number, decision: "APROVADO" | "REJEITADO") {
    if (busy) return;
    setBusy(true);
    try {
      await periodicRequestService.decide(id, decision);
      toast.success(
        decision === "APROVADO"
          ? "Solicitação aprovada e incluída no cronograma."
          : "Solicitação rejeitada.",
      );
      reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível decidir.",
      );
      reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="stack">
      <div className="section-heading">
        <Text as="h2" variant="headline">
          {profile === "gestor"
            ? "Solicitações das equipes"
            : "Minhas solicitações de periódicas"}
        </Text>
        <div className="button-row">
          <RefreshButton onClick={reload} disabled={busy} />
          {profile === "equipe" && (
            <Can roles={[Roles.TEAM]}>
              <button className="button primary" onClick={() => setForm(true)}>
                <Plus size={16} />
                Nova solicitação
              </button>
            </Can>
          )}
        </div>
      </div>
      <DataState
        loading={isLoading}
        error={error}
        empty={!data?.length}
        reload={reload}
      >
        <div className="stack">
          {data?.map((item) => (
            <Frame className="panel" key={item.id}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    EQUIPE {TEAM_LABELS[item.team].toUpperCase()}
                  </span>
                  <h3>{item.title}</h3>
                  <p className="muted">
                    {item.location} • {formatDate(item.date)}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              {item.status === "PENDENTE" && (
                <Can roles={[Roles.ADMIN]}>
                  <div className="button-row">
                    <button
                      className="button success"
                      disabled={busy}
                      onClick={() => void decide(item.id, "APROVADO")}
                    >
                      Aprovar e incluir no cronograma
                    </button>
                    <button
                      className="button danger"
                      disabled={busy}
                      onClick={() => void decide(item.id, "REJEITADO")}
                    >
                      Rejeitar
                    </button>
                  </div>
                </Can>
              )}
            </Frame>
          ))}
        </div>
      </DataState>
      {form && (
        <MaintenanceForm
          requestMode
          onClose={() => setForm(false)}
          onSave={async (dto) => {
            const input: RequestInput = {
              title: dto.title,
              location: dto.location,
              date: dto.date,
            };
            await periodicRequestService.create(input);
            toast.success("Solicitação enviada ao gestor.");
            reload();
          }}
        />
      )}
    </section>
  );
}
