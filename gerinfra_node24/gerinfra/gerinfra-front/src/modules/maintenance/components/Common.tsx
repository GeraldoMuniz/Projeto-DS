import { Text } from "@cincoders/cinnamon";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_LABELS, type TicketStatus } from "../maintenance.types";
export function StatusBadge({
  status,
}: {
  status: TicketStatus | "PENDENTE" | "APROVADO" | "REJEITADO";
}) {
  const label =
    status in STATUS_LABELS
      ? STATUS_LABELS[status as TicketStatus]
      : (
          {
            PENDENTE: "Pendente",
            APROVADO: "Aprovado",
            REJEITADO: "Rejeitado",
          } as const
        )[status as "PENDENTE" | "APROVADO" | "REJEITADO"];
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {label}
    </span>
  );
}
export function DataState({
  loading,
  error,
  empty,
  reload,
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty: boolean;
  reload: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <p className="empty-state" role="status">
        Carregando…
      </p>
    );
  if (error)
    return (
      <div className="empty-state" role="alert">
        <Text variant="alarm">{error.message}</Text>
        <button className="button secondary" onClick={reload}>
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      </div>
    );
  if (empty)
    return <div className="empty-state">Nenhum registro por aqui.</div>;
  return <>{children}</>;
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <Text as="h1" variant="title">
          {title}
        </Text>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function RefreshButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="button secondary"
      onClick={onClick}
      disabled={disabled}
      aria-label="Atualizar dados"
    >
      <RefreshCw size={16} />
      Atualizar
    </button>
  );
}
