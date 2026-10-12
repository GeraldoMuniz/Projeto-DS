# Arquitetura do Gerinfra

## Padrões preservados

A API é um monólito modular NestJS. `AuthGuard` e `RolesGuard` são globais; somente health é público. O `KeycloakIdentitySource` verifica JWT, expiração, issuer e audience por JWKS. O `PrismaService` é compartilhado; cada módulo mantém DTOs Zod e seus serviços. O filtro global usa Problem Details e o interceptor envolve as respostas bem-sucedidas em `data`.

No frontend, Cinnamon fornece o layout autenticado, navbar, rodapé, textos, frames e toasts. `PageCin` protege as rotas; `Can` protege ações de interface. O backend sempre decide a autorização real. Services de entidades usam o cliente HTTP do boilerplate; os hooks são construídos sobre `useAsync`. Os módulos não importam outros módulos de domínio. Providers globais ficam em `app/provider.tsx`, e ErrorBoundary isola cada rota.

## Identidades

| Papel no Keycloak | Perfil no backend | Escopo |
| --- | --- | --- |
| `sys_gerinfra-admin` | `ADMIN` | Gestão de todos os chamados, periódicas e solicitações |
| `sys_gerinfra-users` | `USER` | Abrir chamados e consultar seus próprios registros |
| `sys_gerinfra-team` + exatamente uma especialidade abaixo | `TEAM` | Operar chamados e consultar periódicas/solicitações da especialidade |

Especialidades: `sys_gerinfra-team-eletrica`, `sys_gerinfra-team-hidraulica`, `sys_gerinfra-team-refrigeracao`, `sys_gerinfra-team-ti-rede`, `sys_gerinfra-team-mobiliario`.

O identificador do solicitante é o `sub` do token verificado. Não é aceito no corpo das requisições. A especialidade da equipe também é resolvida pelo token. Tokens sem `sub`, papel reconhecido ou especialidade única para equipes são rejeitados. Prioridade de perfil: ADMIN, TEAM, USER. Uma conta de equipe pode conter também o papel de solicitante, mas operará como TEAM.

O gestor vê todas as mensagens. A equipe vê o histórico dos chamados que lhe foram atribuídos. Mensagens com audiência `TEAM` não são devolvidas ao solicitante; ele recebe `ALL` e `REQUESTER`. Como no HTML, o motivo de retorno e o feedback de conclusão ficam disponíveis no acompanhamento do solicitante.

## Estados e ações

| Ação | Quem | Resultado / condição |
| --- | --- | --- |
| Abrir chamado | Solicitante | TRIAGEM |
| Alocar / Reencaminhar | Gestor | ACOMPANHAMENTO, define equipe e limpa motivo de retorno atual |
| Iniciar análise | Equipe atribuída | EM_ANALISE |
| Iniciar execução | Equipe atribuída | EM_ANDAMENTO |
| Concluir | Equipe atribuída | CONCLUIDO, com feedback obrigatório |
| Retornar | Equipe atribuída | RETORNADO, com justificativa obrigatória |
| Fechar administrativamente | Gestor | CONCLUIDO, somente após retorno |
| Enviar mensagem | Gestor / equipe atribuída | Registro na linha do tempo; equipe envia ao solicitante |
| Alterar prioridade | Gestor / equipe atribuída | URGENTE, MODERADO ou LEVE |

Chamados retornados continuam visíveis na fila da equipe; precisam de reencaminhamento do gestor antes de análise, execução ou conclusão. Chamados concluídos não recebem novas alterações. Toda ação inclui a versão atual; uma edição concorrente recebe 409 e exige recarregar.

## Persistência

`Ticket` armazena o estado, solicitante, equipe e versão; `TicketMessage` mantém autor, destinatário e data. `PeriodicMaintenance` armazena uma programação por data, e `PeriodicRequest` registra a solicitação da equipe e sua decisão. As tabelas originais de exemplo permanecem como referência.

A exclusão de periódicas usa `active=false`, preservando os vínculos dos chamados já gerados. Aprovar uma solicitação altera seu estado e cria a periódica numa única transação. Uma solicitação já decidida recebe 409. A combinação de periódica e data é única em `Ticket`, e a geração bloqueia a versão antes de criar a ocorrência. Listas são paginadas pela API, com limite máximo de 100; o service frontend percorre as páginas para compor os quadros completos do protótipo.

Não foi criado intervalo de recorrência ou job agendado, pois o HTML só oferece data e geração manual. Isso pode ser ampliado com o cliente posteriormente.

## Contratos principais

Todas as rotas abaixo usam a base `/gerinfra/api/v1` e exigem Bearer token.

| Método | Rota | Entrada |
| --- | --- | --- |
| GET | `/tickets?page=1&limit=100` | Lista limitada pelo perfil |
| POST | `/tickets` | `location`, `type`, `urgency`, `description` |
| GET | `/tickets/:id` | Detalhe + mensagens visíveis |
| POST | `/tickets/:id/actions` | `action`, `version` e campos específicos |
| GET / POST | `/periodic` | Lista / `title`, `location`, `date`, `team` |
| PATCH | `/periodic/:id` | Mesmos campos + `version` |
| DELETE | `/periodic/:id` | Corpo JSON com `version` |
| POST | `/periodic/:id/generate` | Corpo JSON com `version` |
| GET / POST | `/periodic/requests` | Lista / `title`, `location`, `date` |
| POST | `/periodic/requests/:id/decision` | `decision`: APROVADO ou REJEITADO |

Exemplo de alocação:

```json
{ "action": "ALLOCATE", "team": "ELETRICA", "version": 0 }
```

Exemplo de conclusão:

```json
{ "action": "COMPLETE", "text": "Lâmpada substituída.", "version": 3 }
```

Tipos de equipe: ELETRICA, HIDRAULICA, REFRIGERACAO, TI_REDE, MOBILIARIO. Datas usam AAAA-MM-DD e são validadas como datas de calendário reais.

## Implantação

O Compose padrão fornece banco e Keycloak para os processos Node locais. O profile `full` inclui migrations, API em container e frontend Nginx. Docker Swarm, LDAP e infraestrutura institucional não foram conectados; dependem das configurações do cliente. O projeto não foi publicado na internet.
