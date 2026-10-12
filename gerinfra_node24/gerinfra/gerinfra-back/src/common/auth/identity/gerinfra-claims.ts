import { AccessDeniedException } from '@/common/exceptions/access-denied.exception';
import { AccessRole } from '../access-role.enum';
import type { CurrentUser } from '../current-user.interface';

export const TEAM_ROLES = {
  'sys_gerinfra-team-eletrica': 'ELETRICA',
  'sys_gerinfra-team-hidraulica': 'HIDRAULICA',
  'sys_gerinfra-team-refrigeracao': 'REFRIGERACAO',
  'sys_gerinfra-team-ti-rede': 'TI_REDE',
  'sys_gerinfra-team-mobiliario': 'MOBILIARIO',
} as const;

/** Called only after JWT signature, issuer, expiration and audience verification. */
export function resolveGerinfraUser(payload: {
  sub?: string;
  name?: unknown;
  preferred_username?: unknown;
  realm_access?: { roles?: string[] };
}): CurrentUser {
  if (!payload.sub) throw new AccessDeniedException('Token sem identificação do usuário.');
  const roles = payload.realm_access?.roles ?? [];
  const displayName =
    typeof payload.name === 'string'
      ? payload.name
      : typeof payload.preferred_username === 'string'
        ? payload.preferred_username
        : 'Usuário';
  if (roles.includes('sys_gerinfra-admin')) {
    return { userId: payload.sub, displayName, role: AccessRole.ADMIN };
  }
  const teams = Object.entries(TEAM_ROLES).filter(([role]) => roles.includes(role));
  if (roles.includes('sys_gerinfra-team')) {
    if (teams.length !== 1)
      throw new AccessDeniedException('Equipe sem especialidade única configurada.');
    return { userId: payload.sub, displayName, role: AccessRole.TEAM, team: teams[0][1] };
  }
  if (roles.includes('sys_gerinfra-users')) {
    return { userId: payload.sub, displayName, role: AccessRole.USER };
  }
  throw new AccessDeniedException('Usuário sem papel reconhecido pelo sistema.');
}
