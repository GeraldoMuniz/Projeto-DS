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
  type Team,
  type Urgency,
  type Profile,
  type TicketAction,
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
                {ticket.feedback && (
                  <div className="notice success">
                    <strong>Feedback da conclusão</strong>
                    <p>{ticket.feedback}</p>
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
                        <button
                          className="button success"
                          disabled={busy}
                          onClick={() => void act({ action: "CLOSE" })}
                        >
                          Fechar chamado administrativamente
                        </button>
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
                          <label>
                            Feedback da solução
                            <textarea
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              maxLength={5000}
                              rows={3}
                              placeholder="Explique o que foi realizado…"
                            />
                          </label>
                          <button
                            className="button success"
                            disabled={busy || !feedback.trim()}
                            onClick={() =>
                              void act({ action: "COMPLETE", text: feedback })
                            }
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
