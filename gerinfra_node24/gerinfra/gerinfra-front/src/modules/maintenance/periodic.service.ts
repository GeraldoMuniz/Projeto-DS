import { allPages, request } from "../../services/request";
import type { Periodic, PeriodicInput, Ticket } from "./maintenance.types";
export const periodicService = {
  list: () => allPages<Periodic>("/periodic"),
  save: (data: PeriodicInput, item?: Periodic) =>
    item
      ? request<Periodic>(`/periodic/${item.id}`, "PATCH", {
          ...data,
          version: item.version,
        })
      : request<Periodic>("/periodic", "POST", data),
  remove: (item: Periodic) =>
    request(`/periodic/${item.id}`, "DELETE", { version: item.version }),
  generate: (item: Periodic) =>
    request<Ticket>(`/periodic/${item.id}/generate`, "POST", {
      version: item.version,
    }),
};
