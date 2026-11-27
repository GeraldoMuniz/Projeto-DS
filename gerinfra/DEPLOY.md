# Implantacao do Gerinfra (Vercel, Render e Neon)

Este ambiente e independente do Docker local. Use bancos vazios e credenciais geradas pelas plataformas.

- Frontend: Vercel, raiz `gerinfra/gerinfra-front`, Vite, Node 24, `npm run build`, saida `dist`.
- Backend: Render, Docker, `gerinfra/gerinfra-back/Dockerfile`, contexto `gerinfra/gerinfra-back`.
- Keycloak: Render, Docker, `gerinfra/keycloak/Dockerfile`, contexto `gerinfra/keycloak`, porta 10000.
- Bancos: dois projetos Neon separados (Gerinfra e Keycloak).

## Segredos (somente nos paineis dos provedores)

Backend: `DATABASE_URL`, `KEYCLOAK_AUTH_SERVER_URL`, `KEYCLOAK_REALM=Local`, `KEYCLOAK_CLIENT_ID=gerinfra-back`, `CORS_ORIGINS`, `NODE_ENV=production`, `API_PREFIX=gerinfra/api`.

Keycloak: `KC_DB=postgres`, `KC_DB_URL`, `KC_DB_USERNAME`, `KC_DB_PASSWORD`, `KC_HOSTNAME`, `KC_HTTP_RELATIVE_PATH=/auth`, `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded`, `KC_HTTP_PORT=10000`, `KC_BOOTSTRAP_ADMIN_USERNAME`, `KC_BOOTSTRAP_ADMIN_PASSWORD`.

Frontend: `VITE_BASE_URL=/`, `VITE_API_URL=https://SEU-BACKEND/gerinfra/api/v1`, `VITE_KEYCLOAK_JSON` (JSON com realm Local, resource gerinfra-front e URL HTTPS do Keycloak).

## Importante

O realm de producao nao contem contas de demonstracao nem senhas padrao. Crie contas com credenciais seguras no console administrativo do Keycloak e atribua os papeis `sys_gerinfra-admin`, `sys_gerinfra-users` ou `sys_gerinfra-team` mais exatamente uma especialidade. A URL do cliente gerinfra-front deve corresponder ao dominio final na Vercel; edite as URIs autorizadas no admin do Keycloak caso mude o dominio.

Aplique as migrations com `npm run migration:run` usando o `DATABASE_URL` direto e execute testes. O comando de seed de demonstracao NAO e executado automaticamente em producao.

Se a Vercel ainda nao estiver ligada ao GitHub, conecte a conta GitHub no painel da Vercel antes de ativar o deploy automatico.
