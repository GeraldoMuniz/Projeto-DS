import { allPages, request } from "../../services/request";
import type { PeriodicRequest, RequestInput } from "./maintenance.types";
export const periodicRequestService = {
  list: () => allPages<PeriodicRequest>("/periodic/requests"),
  create: (data: RequestInput) =>
    request<PeriodicRequest>("/periodic/requests", "POST", data),
  decide: (id: number, decision: "APROVADO" | "REJEITADO") =>
    request<PeriodicRequest>(`/periodic/requests/${id}/decision`, "POST", {
      decision,
    }),
};
