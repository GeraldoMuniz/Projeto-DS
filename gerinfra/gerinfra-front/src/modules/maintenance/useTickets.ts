import { useAsync } from "../../hooks/useAsync";
import { ticketService } from "./ticket.service";
export const useTickets = () => useAsync(ticketService.list);
export const useTicket = (id: number) =>
  useAsync(() => ticketService.detail(id), [id]);
