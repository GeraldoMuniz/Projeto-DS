import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from 'jose';
import { AccessDeniedException } from '@/common/exceptions/access-denied.exception';
import type { CurrentUser } from '../current-user.interface';
import { resolveGerinfraUser } from './gerinfra-claims';
import type { IdentitySource } from './identity-source.interface';

// Tolerância de relógio (segundos) entre o Keycloak e esta API ao validar exp/iat.
const CLOCK_TOLERANCE_SECONDS = 5;

/**
 * Claims relevantes do access token emitido pelo Keycloak.
 * `realm_access.roles` carrega as roles de realm.
 */
interface KeycloakTokenPayload extends JWTPayload {
  sub?: string;
  // `azp` (authorized party) = client que solicitou o token. O Keycloak costuma
  // colocar o clientId aqui e deixar `aud` como "account", então validamos os dois.
  azp?: string;
  realm_access?: { roles?: string[] };
}

/**
 * Mapeia roles de realm do Keycloak para as roles internas (AccessRole).
 * A chave é o nome da role no Keycloak; o valor é a role do sistema.
 * Ajuste este mapa para as roles reais do realm do seu projeto.
 */
@Injectable()
export class KeycloakIdentitySource implements IdentitySource {
  private readonly logger = new Logger(KeycloakIdentitySource.name);
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private issuer?: string;
  private clientId?: string;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Inicializa issuer/JWKS sob demanda (na primeira validação de token), evitando
   * I/O de rede na construção do provider durante o bootstrap do módulo.
   */
  private ensureInitialized(): void {
    if (this.jwks) {
      return;
    }
    const authServerUrl = this.configService.get<string>('keycloak.authServerUrl');
    const realm = this.configService.get<string>('keycloak.realm');
    this.clientId = this.configService.get<string>('keycloak.clientId') || undefined;

    if (!authServerUrl || !realm) {
      throw new Error(
        'Configuração do Keycloak ausente: defina KEYCLOAK_AUTH_SERVER_URL e KEYCLOAK_REALM.',
      );
    }

    const base = authServerUrl.replace(/\/$/, '');
    this.issuer = `${base}/realms/${realm}`;
    this.jwks = createRemoteJWKSet(
      new URL(
        this.configService.get<string>('keycloak.jwksUrl') ??
          `${this.issuer}/protocol/openid-connect/certs`,
      ),
      {
        // Revalida periodicamente o key set (rotação de chaves do Keycloak).
        cacheMaxAge: this.configService.get<number>('keycloak.jwksCacheMaxAge'),
        // Falha rápido se o endpoint JWKS não responder, em vez de travar a requisição.
        timeoutDuration: this.configService.get<number>('keycloak.jwksTimeout'),
      },
    );
  }

  async extract(req: Request): Promise<CurrentUser | null> {
    const token = this.readBearerToken(req);
    if (!token) {
      return null;
    }

    this.ensureInitialized();

    let payload: KeycloakTokenPayload;
    try {
      // Não usamos a opção `audience` do jose: o Keycloak costuma colocar o clientId
      // em `azp`, não em `aud`. A audiência é validada manualmente abaixo.
      // biome-ignore lint/style/noNonNullAssertion: ensureInitialized() garante jwks.
      const result = await jwtVerify<KeycloakTokenPayload>(token, this.jwks!, {
        issuer: this.issuer,
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });
      payload = result.payload;
    } catch (error) {
      this.logger.debug(`Falha ao verificar o token: ${(error as Error).message}`);
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    if (!this.hasValidAudience(payload)) {
      throw new AccessDeniedException('Token emitido para outro cliente.');
    }

    return resolveGerinfraUser(payload);
  }

  /**
   * Aceita o token se o clientId configurado aparecer em `aud` (string ou array)
   * ou em `azp`. Se nenhum clientId estiver configurado, a audiência não é validada.
   */
  private hasValidAudience(payload: KeycloakTokenPayload): boolean {
    if (!this.clientId) {
      return true;
    }
    const aud = payload.aud;
    const audiences = Array.isArray(aud) ? aud : aud ? [aud] : [];
    return audiences.includes(this.clientId) || payload.azp === this.clientId;
  }

  private readBearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, value] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value) {
      return null;
    }
    return value;
  }
}
