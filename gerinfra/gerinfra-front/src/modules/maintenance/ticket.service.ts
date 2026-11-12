import { allPages, request } from "../../services/request";
import type { CreateTicket, Ticket, TicketAction } from "./maintenance.types";
export const ticketService = {
  list: () => allPages<Ticket>("/tickets"),
  detail: (id: number) => request<Ticket>(`/tickets/${id}`),
  create: (data: CreateTicket) => request<Ticket>("/tickets", "POST", data),
  action: (id: number, data: TicketAction) =>
    request<Ticket>(`/tickets/${id}/actions`, "POST", data),
};
