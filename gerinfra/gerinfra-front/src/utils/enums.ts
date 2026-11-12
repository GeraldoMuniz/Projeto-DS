export enum Links {
  ACCOUNT_MANAGEMENT = "https://account.cin.ufpe.br",
  INTRANET_HOME = "https://intranet.cin.ufpe.br/",
  HOME = "/",
  FORBIDDEN = "/forbidden",
  TODOS = "/todos",
  TEAM = "/team",
  REQUESTER = "/solicitante",
  MANAGER = "/gestao",
  OPERATOR = "/equipe",
}

/**
 * Rotas exclusivas de administradores — ocultadas do menu para os demais perfis.
 * A restrição de verdade é o `permittedRoles` da rota em `routes.tsx`; esta
 * lista só evita mostrar um link que levaria a `/forbidden`.
 */
export const ADMIN_ONLY_LINKS: string[] = [Links.TEAM];

/**
 * Roles do sistema no realm do Keycloak — fonte única do modelo.
 *
 * Precedência de fato: ADMIN faz tudo; quem tem só USERS lê. Isso é
 * expresso listando as roles permitidas em cada rota (`permittedRoles`) e
 * em cada ação (`<Can roles={[...]}>`).
 */
export enum Roles {
  USERS = "sys_gerinfra-users",
  ADMIN = "sys_gerinfra-admin",
  TEAM = "sys_gerinfra-team",
}

/**
 * Rotas de leitura: qualquer usuário autenticado do sistema. ADMIN entra
 * explícito para não depender de composite role no Keycloak — o match do
 * `RequireAuth` é "tem ao menos uma destas".
 */
export const ALL_ROLES: Roles[] = [Roles.USERS, Roles.ADMIN, Roles.TEAM];

/** Roles que podem criar e editar conteúdo. */
export const WRITE_ROLES: Roles[] = [Roles.ADMIN];

export const NAV_ROLES: Record<string, Roles[]> = {
  [Links.REQUESTER]: [Roles.USERS],
  [Links.MANAGER]: [Roles.ADMIN],
  [Links.OPERATOR]: [Roles.TEAM],
};
