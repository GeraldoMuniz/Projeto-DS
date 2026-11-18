import { API_URL, fetchApi, getApiErrorMessage } from "../../services/api";
import { allPages, request } from "../../services/request";
import type { CreateTicket, Ticket, TicketAction } from "./maintenance.types";

export const ticketService = {
  list: () => allPages<Ticket>("/tickets"),
  detail: (id: number) => request<Ticket>(`/tickets/${id}`),
  create: async (data: CreateTicket & { imagem?: File }): Promise<Ticket> => {
    const { imagem, ...dados } = data;
    if (!imagem) return request<Ticket>("/tickets", "POST", dados);
    const formulario = new FormData();
    formulario.append("location", dados.location);
    formulario.append("type", dados.type);
    formulario.append("urgency", dados.urgency);
    formulario.append("description", dados.description);
    formulario.append("imagem", imagem);
    // Sem Content-Type manual: o navegador cria o boundary multipart.
    const resposta = await fetchApi(`${API_URL}/tickets`, { method: "POST", body: formulario });
    if (!resposta.ok) throw new Error(await getApiErrorMessage(resposta, "Não foi possível enviar o chamado."));
    return (await resposta.json()).data as Ticket;
  },
  image: async (id: number, signal?: AbortSignal): Promise<Blob> => {
    const resposta = await fetchApi(`${API_URL}/tickets/${id}/imagem`, { signal });
    if (!resposta.ok) throw new Error(await getApiErrorMessage(resposta, "Não foi possível carregar a imagem."));
    return resposta.blob();
  },
  action: (id: number, data: TicketAction) =>
    request<Ticket>(`/tickets/${id}/actions`, "POST", data),
};
