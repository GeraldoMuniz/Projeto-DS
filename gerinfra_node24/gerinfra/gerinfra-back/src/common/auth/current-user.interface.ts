import type { AccessRole } from './access-role.enum';

export interface CurrentUser {
  userId?: string;
  role: AccessRole;
  displayName?: string;
  team?: 'ELETRICA' | 'HIDRAULICA' | 'REFRIGERACAO' | 'TI_REDE' | 'MOBILIARIO';
}
