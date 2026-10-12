import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, MapPin } from "lucide-react";
import {
  TEAM_LABELS,
  URGENCIES,
  URGENCY_LABELS,
  type Ticket,
  type Urgency,
} from "../maintenance.types";
import { StatusBadge } from "./Common";
function Card({
  ticket,
  onOpen,
  draggable = false,
  disabled = false,
}: {
  ticket: Ticket;
  onOpen: (ticket: Ticket) => void;
  draggable?: boolean;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: ticket.id, disabled: !draggable || disabled });
  return (
    <article
      ref={setNodeRef}
      className={`ticket-card ${isDragging ? "dragging" : ""}`}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 10,
            }
          : undefined
      }
    >
      <div className="card-meta">
        <span>
          #{ticket.id}
          {ticket.periodicId ? " • Periódica" : ""}
        </span>
        {draggable && (
          <button
            type="button"
            className="drag-handle"
            aria-label={`Mover chamado ${ticket.id}`}
            {...attributes}
            {...listeners}
            disabled={disabled}
          >
            <GripVertical size={18} />
          </button>
        )}
      </div>
      <button className="card-title" onClick={() => onOpen(ticket)}>
        {ticket.title}
      </button>
      <p className="card-location">
        <MapPin size={13} />
        {ticket.location}
      </p>
      <p className="card-description">{ticket.description}</p>
      <div className="card-footer">
        <StatusBadge status={ticket.status} />
        <span>{ticket.team ? TEAM_LABELS[ticket.team] : "Não alocada"}</span>
      </div>
    </article>
  );
}
function Column({
  id,
  title,
  items,
  onOpen,
  draggable,
  disabled,
}: {
  id: string;
  title: string;
  items: Ticket[];
  onOpen: (ticket: Ticket) => void;
  draggable?: boolean;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !draggable || disabled,
  });
  return (
    <section
      ref={setNodeRef}
      className={`kanban-column column-${id.toLowerCase()} ${isOver ? "drop-over" : ""}`}
      aria-label={title}
    >
      <div className="column-heading">
        <h2>{title}</h2>
        <span>{items.length}</span>
      </div>
      <div className="column-cards">
        {items.map((ticket) => (
          <Card
            key={ticket.id}
            ticket={ticket}
            onOpen={onOpen}
            draggable={draggable}
            disabled={disabled}
          />
        ))}
        {!items.length && <p className="column-empty">Sem chamados</p>}
      </div>
    </section>
  );
}
export function ManagerBoard({
  tickets,
  onOpen,
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
}) {
  return (
    <div className="kanban-board">
      {[
        {
          id: "TRIAGEM",
          title: "Triagem",
          items: tickets.filter((t) => t.status === "TRIAGEM"),
        },
        {
          id: "ACOMPANHAMENTO",
          title: "Acompanhamento",
          items: tickets.filter(
            (t) => !["TRIAGEM", "CONCLUIDO"].includes(t.status),
          ),
        },
        {
          id: "CONCLUIDO",
          title: "Histórico de concluídos",
          items: tickets.filter((t) => t.status === "CONCLUIDO"),
        },
      ].map((col) => (
        <Column key={col.id} {...col} onOpen={onOpen} />
      ))}
    </div>
  );
}
export function TeamBoard({
  tickets,
  onOpen,
  onMove,
  disabled,
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
  onMove: (ticket: Ticket, urgency: Urgency) => Promise<void>;
  disabled: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const active = tickets.filter((t) => t.status !== "CONCLUIDO");
  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || disabled) return;
    const ticket = active.find((t) => t.id === event.active.id);
    const urgency = event.over.id as Urgency;
    if (ticket && URGENCIES.includes(urgency) && ticket.urgency !== urgency)
      void onMove(ticket, urgency);
  }
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {URGENCIES.map((urgency) => (
          <Column
            key={urgency}
            id={urgency}
            title={URGENCY_LABELS[urgency]}
            items={active.filter((t) => t.urgency === urgency)}
            onOpen={onOpen}
            draggable
            disabled={disabled}
          />
        ))}
      </div>
    </DndContext>
  );
}
export function TicketList({
  tickets,
  onOpen,
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
}) {
  return (
    <div className="ticket-list">
      {tickets.map((ticket) => (
        <Card key={ticket.id} ticket={ticket} onOpen={onOpen} />
      ))}
    </div>
  );
}
