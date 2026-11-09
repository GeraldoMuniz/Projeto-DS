import { formatTime } from "../format";
import { Dialog } from "@base-ui/react";
import { useState } from "react";
import { Text, toast } from "@cincoders/cinnamon";
import { X, MapPin } from "lucide-react";
import { Can } from "../../../components/auth/Can";
import { Roles } from "../../../utils/enums";
import { ticketService } from "../ticket.service";
import { useTicket } from "../useTickets";
import {
  TEAMS,
  TEAM_LABELS,
  URGENCIES,
  URGENCY_LABELS,
  OUTCOME_LABELS,
  type Team,
  type Urgency,
  type Profile,
  type TicketAction,
  type TicketOutcome,
} from "../maintenance.types";
import { DataState, StatusBadge } from "./Common";
export function TicketDetail({
  id,
  profile,
  onClose,
  onChanged,
}: {
  id: number;
  profile: Profile;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: ticket, isLoading, error, reload } = useTicket(id);
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState<Team>("ELETRICA");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"REQUESTER" | "TEAM">("REQUESTER");
  const [feedback, setFeedback] = useState("");
  const [outcome, setOutcome] = useState<TicketOutcome | "">("");
  const [reason, setReason] = useState("");
  const closed = ticket?.status === "CONCLUIDO";
  const returned = ticket?.status === "RETORNADO";
  async function act(dto: Omit<TicketAction, "version">) {
    if (!ticket || busy) return;
    setBusy(true);
    try {
      await ticketService.action(id, { ...dto, version: ticket.version });
      toast.success("Chamado atualizado.");
      setMessage("");
      reload();
      onChanged();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível atualizar.",
      );
      reload();
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Popup className="modal-panel detail-panel">
          <div className="modal-heading">
            <div>
              <span className="eyebrow">CHAMADO #{id}</span>
              <Dialog.Title className="modal-title">
                {ticket?.title ?? "Detalhes do chamado"}
              </Dialog.Title>
            </div>
            <Dialog.Close
              className="icon-button"
              disabled={busy}
              aria-label="Fechar detalhes"
            >
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Histórico e ações disponíveis para este chamado.
          </Dialog.Description>
          <DataState
            loading={isLoading}
            error={error}
            empty={!ticket}
            reload={reload}
          >
            {ticket && (
              <div className="stack">
                <div className="detail-summary">
                  <StatusBadge status={ticket.status} />
                  <span>
                    <MapPin size={14} />
                    {ticket.location}
                  </span>
                  <span>
                    Equipe:{" "}
                    {ticket.team ? TEAM_LABELS[ticket.team] : "Não alocada"}
                  </span>
                </div>
                <p className="description-full">{ticket.description}</p>
                {ticket.returnReason && (
                  <div className="notice warning">
                    <strong>Motivo do retorno</strong>
                    <p>{ticket.returnReason}</p>
                  </div>
                )}
                {closed && (
                  <div
                    className={`notice ${ticket.outcome === "SUCESSO" ? "success" : "warning"}`}
                  >
                    <strong>
                      Resultado da conclusão:{" "}
                      {ticket.outcome
                        ? OUTCOME_LABELS[ticket.outcome]
                        : "Não informado"}
                    </strong>
                    {ticket.closedAt && (
                      <p>Concluído em {formatTime(ticket.closedAt)}</p>
                    )}
                    {ticket.feedback && <p>{ticket.feedback}</p>}
                  </div>
                )}
                {!closed && profile === "gestor" && (
                  <Can roles={[Roles.ADMIN]}>
                    <section className="action-section">
                      <Text as="h2" variant="headline">
                        Alocar equipe responsável
                      </Text>
                      <div className="inline-form">
                        <label className="grow">
                          Equipe
                          <select
                            value={team}
                            onChange={(e) => setTeam(e.target.value as Team)}
                          >
                            {TEAMS.map((t) => (
                              <option key={t} value={t}>
                                {TEAM_LABELS[t]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() => void act({ action: "ALLOCATE", team })}
                        >
                          Alocar / Reencaminhar
                        </button>
                      </div>
                      {returned && (
                        <>
                          <h3>Encerramento administrativo</h3>
                          <CompletionFields
                            outcome={outcome}
                            onOutcomeChange={setOutcome}
                            feedback={feedback}
                            onFeedbackChange={setFeedback}
                            disabled={busy}
                            administrative
                          />
                          <button
                            className="button primary"
                            disabled={busy || !outcome || !feedback.trim()}
                            onClick={() => {
                              if (outcome)
                                void act({
                                  action: "CLOSE",
                                  outcome,
                                  text: feedback.trim(),
                                });
                            }}
                          >
                            Fechar chamado administrativamente
                          </button>
                        </>
                      )}
                    </section>
                  </Can>
                )}
                {!closed && profile === "equipe" && (
                  <Can roles={[Roles.TEAM]}>
                    <section className="action-section">
                      <Text as="h2" variant="headline">
                        Atendimento da equipe
                      </Text>
                      {returned ? (
                        <p className="notice warning">
                          Retorno enviado. Aguarde a decisão do gestor para
                          continuar o atendimento.
                        </p>
                      ) : (
                        <>
                          <div className="button-row">
                            <button
                              className="button secondary"
                              disabled={busy || ticket.status === "EM_ANALISE"}
                              onClick={() =>
                                void act({
                                  action: "PROGRESS",
                                  status: "EM_ANALISE",
                                })
                              }
                            >
                              Em análise
                            </button>
                            <button
                              className="button secondary"
                              disabled={
                                busy || ticket.status === "EM_ANDAMENTO"
                              }
                              onClick={() =>
                                void act({
                                  action: "PROGRESS",
                                  status: "EM_ANDAMENTO",
                                })
                              }
                            >
                              Em andamento
                            </button>
                          </div>
                          <CompletionFields
                            outcome={outcome}
                            onOutcomeChange={setOutcome}
                            feedback={feedback}
                            onFeedbackChange={setFeedback}
                            disabled={busy}
                          />
                          <button
                            className="button primary"
                            disabled={busy || !outcome || !feedback.trim()}
                            onClick={() => {
                              if (outcome)
                                void act({
                                  action: "COMPLETE",
                                  outcome,
                                  text: feedback.trim(),
                                });
                            }}
                          >
                            Concluir chamado
                          </button>
                          <label>
                            Motivo do retorno à Gerinfra
                            <textarea
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              maxLength={5000}
                              rows={3}
                              placeholder="Ex.: necessidade de serviço terceirizado…"
                            />
                          </label>
                          <button
                            className="button warning"
                            disabled={busy || !reason.trim()}
                            onClick={() =>
                              void act({ action: "RETURN", text: reason })
                            }
                          >
                            Retornar à gestão
                          </button>
                        </>
                      )}
                      <label>
                        Prioridade
                        <select
                          value={ticket.urgency}
                          disabled={busy}
                          onChange={(e) =>
                            void act({
                              action: "PRIORITY",
                              urgency: e.target.value as Urgency,
                            })
                          }
                        >
                          {URGENCIES.map((u) => (
                            <option key={u} value={u}>
                              {URGENCY_LABELS[u]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </section>
                  </Can>
                )}
                {!closed && profile !== "solicitante" && (
                  <Can roles={[Roles.ADMIN, Roles.TEAM]}>
                    <section className="action-section">
                      <Text as="h2" variant="headline">
                        Enviar mensagem
                      </Text>
                      {profile === "gestor" && (
                        <label>
                          Destinatário
                          <select
                            value={audience}
                            onChange={(e) =>
                              setAudience(
                                e.target.value as "TEAM" | "REQUESTER",
                              )
                            }
                          >
                            <option value="REQUESTER">Solicitante</option>
                            <option value="TEAM" disabled={!ticket.team}>
                              Equipe responsável
                            </option>
                          </select>
                        </label>
                      )}
                      <label>
                        Mensagem
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          maxLength={5000}
                          rows={3}
                        />
                      </label>
                      <button
                        className="button primary"
                        disabled={busy || !message.trim()}
                        onClick={() =>
                          void act({
                            action: "MESSAGE",
                            text: message,
                            audience:
                              profile === "equipe" ? "REQUESTER" : audience,
                          })
                        }
                      >
                        Enviar mensagem
                      </button>
                    </section>
                  </Can>
                )}
                <section className="timeline">
                  <Text as="h2" variant="headline">
                    Linha do tempo
                  </Text>
                  {!ticket.messages?.length && (
                    <p className="muted">Nenhuma mensagem registrada.</p>
                  )}
                  {ticket.messages?.map((msg) => (
                    <article key={msg.id}>
                      <div>
                        <strong>{msg.sender}</strong>
                        <time>{formatTime(msg.createdAt)}</time>
                      </div>
                      {msg.audience === "TEAM" && (
                        <span className="eyebrow">INSTRUÇÃO À EQUIPE</span>
                      )}
                      <p>{msg.text}</p>
                    </article>
                  ))}
                </section>
              </div>
            )}
          </DataState>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CompletionFields({
  outcome,
  onOutcomeChange,
  feedback,
  onFeedbackChange,
  disabled,
  administrative = false,
}: {
  outcome: TicketOutcome | "";
  onOutcomeChange: (value: TicketOutcome | "") => void;
  feedback: string;
  onFeedbackChange: (value: string) => void;
  disabled: boolean;
  administrative?: boolean;
}) {
  return (
    <>
      <label>
        Resultado da conclusão
        <select
          value={outcome}
          onChange={(event) =>
            onOutcomeChange(event.target.value as TicketOutcome | "")
          }
          disabled={disabled}
          required
        >
          <option value="">Selecione o resultado</option>
          <option value="SUCESSO">Bem-sucedido — problema resolvido</option>
          <option value="SEM_SUCESSO">Sem sucesso — problema não resolvido</option>
        </select>
      </label>
      <label>
        {administrative ? "Justificativa do encerramento" : "Feedback da solução"}
        <textarea
          value={feedback}
          onChange={(event) => onFeedbackChange(event.target.value)}
          disabled={disabled}
          required
          maxLength={5000}
          rows={3}
          placeholder="Explique a solução aplicada ou o motivo do encerramento sem sucesso…"
        />
      </label>
    </>
  );
}
