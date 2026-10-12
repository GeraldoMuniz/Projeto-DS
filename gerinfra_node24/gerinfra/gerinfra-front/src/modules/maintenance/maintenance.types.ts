export const TEAMS = [
  "ELETRICA",
  "HIDRAULICA",
  "REFRIGERACAO",
  "TI_REDE",
  "MOBILIARIO",
] as const;
export type Team = (typeof TEAMS)[number];
export const TEAM_LABELS: Record<Team, string> = {
  ELETRICA: "Elétrica",
  HIDRAULICA: "Hidráulica",
  REFRIGERACAO: "Refrigeração",
  TI_REDE: "TI / Rede",
  MOBILIARIO: "Mobiliário",
};
export const URGENCIES = ["URGENTE", "MODERADO", "LEVE"] as const;
export type Urgency = (typeof URGENCIES)[number];
export const URGENCY_LABELS: Record<Urgency, string> = {
  URGENTE: "Urgente",
  MODERADO: "Moderado",
  LEVE: "Leve",
};
export type TicketStatus =
  | "TRIAGEM"
  | "ACOMPANHAMENTO"
  | "EM_ANALISE"
  | "EM_ANDAMENTO"
  | "RETORNADO"
  | "CONCLUIDO";
export const STATUS_LABELS: Record<TicketStatus, string> = {
  TRIAGEM: "Em triagem",
  ACOMPANHAMENTO: "Alocado à equipe",
  EM_ANALISE: "Em análise",
  EM_ANDAMENTO: "Em andamento",
  RETORNADO: "Retornado à gestão",
  CONCLUIDO: "Concluído",
};
export type Profile = "solicitante" | "gestor" | "equipe";
export interface Ticket {
  id: number;
  title: string;
  location: string;
  type: Team | null;
  urgency: Urgency;
  status: TicketStatus;
  description: string;
  team: Team | null;
  feedback: string | null;
  returnReason: string | null;
  version: number;
  createdAt: string;
  requesterName: string;
  periodicId: number | null;
  messages?: {
    id: number;
    sender: string;
    text: string;
    audience: "ALL" | "REQUESTER" | "TEAM";
    createdAt: string;
  }[];
}
export interface CreateTicket {
  location: string;
  type: Team;
  urgency: Urgency;
  description: string;
}
export interface TicketAction {
  action:
    | "ALLOCATE"
    | "PROGRESS"
    | "COMPLETE"
    | "RETURN"
    | "MESSAGE"
    | "CLOSE"
    | "PRIORITY";
  version: number;
  team?: Team;
  status?: "EM_ANALISE" | "EM_ANDAMENTO";
  text?: string;
  urgency?: Urgency;
  audience?: "REQUESTER" | "TEAM";
}
export interface Periodic {
  id: number;
  title: string;
  location: string;
  date: string;
  team: Team | null;
  version: number;
}
export type PeriodicInput = Omit<Periodic, "id" | "version">;
export interface PeriodicRequest {
  id: number;
  title: string;
  location: string;
  date: string;
  team: Team;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
}
export type RequestInput = Pick<PeriodicInput, "title" | "location" | "date">;
