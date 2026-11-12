import { describe, expect, it } from 'vitest';
import { AccessRole } from '../access-role.enum';
import { resolveGerinfraUser } from './gerinfra-claims';

describe('Claims verificados do Keycloak', () => {
  it('mapeia solicitante, gestor e equipe e resolve precedência', () => {
    expect(
      resolveGerinfraUser({ sub: 'x', realm_access: { roles: ['sys_gerinfra-users'] } }).role,
    ).toBe(AccessRole.USER);
    expect(
      resolveGerinfraUser({
        sub: 'x',
        realm_access: { roles: ['sys_gerinfra-team', 'sys_gerinfra-team-eletrica'] },
      }).team,
    ).toBe('ELETRICA');
    expect(
      resolveGerinfraUser({
        sub: 'x',
        realm_access: { roles: ['sys_gerinfra-team', 'sys_gerinfra-admin'] },
      }).role,
    ).toBe(AccessRole.ADMIN);
  });
  it('nega tokens sem sub, sem papel e equipes com especialidade ambígua', () => {
    expect(() =>
      resolveGerinfraUser({ realm_access: { roles: ['sys_gerinfra-admin'] } }),
    ).toThrow();
    expect(() =>
      resolveGerinfraUser({ sub: 'x', realm_access: { roles: ['offline_access'] } }),
    ).toThrow();
    expect(() =>
      resolveGerinfraUser({ sub: 'x', realm_access: { roles: ['sys_gerinfra-team'] } }),
    ).toThrow();
    expect(() =>
      resolveGerinfraUser({
        sub: 'x',
        realm_access: {
          roles: [
            'sys_gerinfra-team',
            'sys_gerinfra-team-eletrica',
            'sys_gerinfra-team-hidraulica',
          ],
        },
      }),
    ).toThrow();
  });
});
