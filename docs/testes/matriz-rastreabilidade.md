# Sprint 3 — Matriz de rastreabilidade (projeto manual)

**Sistema:** Gerinfra CIn-UFPE — API NestJS/TypeScript.
**Escopo:** `gerinfra/gerinfra-back/src/modules/tickets/ticket.policy.ts` e `gerinfra/gerinfra-back/src/modules/tickets/dto/ticket.dto.ts`.
**Origem:** funcionalidades implementadas de chamados documentadas em `gerinfra/docs/ARQUITETURA.md`; os identificadores US01–US06 são uma organização desta atividade, não códigos originais comprovados da Sprint 2.
**Elaboração manual:** 12/11/2026, antes da geração da suíte v1.

## Histórias de usuário e critérios

- **US01 — Controle de acesso:** solicitante enxerga seus chamados, equipe somente sua especialidade e gestor todos; identidade e equipe precisam estar configuradas.
- **US02 — Alocar e reencaminhar:** somente gestor atribui equipe válida; realocação reinicia acompanhamento e limpa motivo de retorno.
- **US03 — Progredir atendimento:** equipe responsável alterna entre análise e andamento, mas não prossegue chamado retornado sem gestor.
- **US04 — Concluir atendimento:** equipe responsável registra feedback, resultado explícito e data de encerramento.
- **US05 — Retornar e fechar:** retorno exige justificativa; gestor pode fechar administrativamente somente chamados retornados.
- **US06 — Mensagens, prioridade e integridade:** enviar conforme permissões, mudar urgência e rejeitar alterações obsoletas ou encerradas.

## Matriz de partições, limites e casos de teste

| Critério | Variável | Partição / limite | Caso esperado | Coberto v1? | Coberto v2? |
|---|---|---|---|---|---|
| US01-CA1 | Perfil USER | solicitante autenticado | CT01: USER(userId=u1) → {requesterId:u1} | Sim | Sim |
| US01-CA2 | Perfil TEAM | equipe com especialidade | CT02: TEAM/ELETRICA → {team:ELETRICA} | Sim | Sim |
| US01-CA3 | Perfil ADMIN | gestor autenticado | CT03: ADMIN → escopo {} | Sim | Sim |
| US01-CA4 | Identidade obrigatória | sem userId | CT04: ADMIN sem userId → ForbiddenException | Não | Sim |
| US01-CA5 | Equipe configurada | TEAM sem especialidade | CT05: TEAM sem team → ForbiddenException | Não | Sim |
| US02-CA1 | Alocação pelo gestor | ADMIN com equipe válida | CT06: ALLOCATE/ELETRICA → ACOMPANHAMENTO | Sim | Sim |
| US02-CA2 | Gestor exclusivo | USER tenta alocar | CT07: USER+ALLOCATE → ForbiddenException | Não | Sim |
| US02-CA3 | Equipe obrigatória | sem team | CT08: ADMIN+ALLOCATE sem team → BadRequestException | Não | Sim |
| US02-CA4 | Reencaminhamento | RETORNADO com equipe nova | CT09: ALLOCATE/HIDRAULICA → limpa returnReason | Não | Sim |
| US03-CA1 | Evolução de estado | duas saídas válidas | CT10: PROGRESS/EM_ANALISE; CT11: PROGRESS/EM_ANDAMENTO | Parcial | Sim |
| US03-CA2 | Equipe responsável | equipe diferente | CT12: TEAM/HIDRAULICA em ELETRICA → ForbiddenException | Não | Sim |
| US03-CA3 | Estado impeditivo | RETORNADO | CT13: PROGRESS em RETORNADO → ConflictException | Não | Sim |
| US04-CA1 | Conclusão com resultado | duas classes de resultado | CT14: COMPLETE/SUCESSO; CT15: COMPLETE/SEM_SUCESSO → CONCLUIDO | Parcial | Sim |
| US04-CA2 | Feedback obrigatório | texto ausente ou vazio | CT16: COMPLETE sem texto; CT17: texto só espaços → BadRequestException | Parcial | Sim |
| US04-CA3 | Resultado obrigatório | ausente | CT18: COMPLETE sem outcome → BadRequestException | Não | Sim |
| US04-CA4 | Data de conclusão | resultado válido | CT19: COMPLETE → closedAt do tipo Date | Não | Sim |
| US05-CA1 | Retorno justificado | texto ausente / válido | CT20: RETURN sem texto → erro; CT21: RETURN com texto → RETORNADO | Parcial | Sim |
| US05-CA2 | Fechamento administrativo | ADMIN + RETORNADO | CT22: CLOSE/SUCESSO com feedback → CONCLUIDO | Sim | Sim |
| US05-CA3 | Estado prévio requerido | ACOMPANHAMENTO | CT23: CLOSE fora de RETORNADO → ConflictException | Não | Sim |
| US05-CA4 | Gestor exclusivo | TEAM em RETORNADO | CT24: TEAM+CLOSE → ForbiddenException | Não | Sim |
| US06-CA1 | Mensagem autorizada | gestor e equipe | CT25: ADMIN MESSAGE/TEAM; CT26: TEAM MESSAGE/REQUESTER | Parcial | Sim |
| US06-CA2 | Audiência restrita | equipe tenta TEAM | CT27: TEAM MESSAGE/TEAM → ForbiddenException | Não | Sim |
| US06-CA3 | Prioridade válida e obrigatória | com/sem urgency | CT28: PRIORITY URGENTE → altera; CT29: sem urgency → erro | Parcial | Sim |
| US06-CA4 | Versão otimista | v=1 e v=2 | CT30: versão divergente → ConflictException; CT31: versão igual → incrementa | Parcial | Sim |
| US06-CA5 | Chamado concluído | estado terminal | CT32: MESSAGE em CONCLUIDO → ConflictException | Não | Sim |

## Análise explícita dos limites

- **Versão:** equivalência e vizinhança do inteiro esperado `2` (casos `1` e `2`); o DTO exige inteiro não negativo. Casos de entrada HTTP a verificar adicionalmente: `-1`, `0`, `1.5`.
- **Tamanho de feedback/mensagem:** texto ausente (`undefined`), texto com espaços (`'   '`), texto presente (`'Ok'`). O DTO aplica `trim`, mínimo 1 e máximo 5000; conferir adicionalmente comprimentos 0, 1, 5000 e 5001 no validador.
- **Status do chamado:** pré-condições válidas `ACOMPANHAMENTO`, `EM_ANALISE`, `EM_ANDAMENTO` e inválidas `RETORNADO`, `CONCLUIDO` por ação.
- **Resultado:** partições `SUCESSO`, `SEM_SUCESSO` e ausente; valor diferente dos permitidos deve ser barrado pelo DTO.
- **Equipes:** uma especialidade válida, equipe ausente e equipe distinta da responsável.
- **Urgência:** `URGENTE`, `MODERADO`, `LEVE` e ausente; fora do enum deve ser rejeitado no DTO.

**Indicadores de inspeção após geração:** v1 atinge pelo menos um CT em 12 dos 25 critérios; v2 contém todos os 32 CT. A marca **Parcial** indica critério com vários CT e apenas parte deles na v1. Estas marcações documentam presença de cenário no teste; execução foi medida separadamente pela CI (12/12 e 49/49). 

**Total do projeto manual:** 25 critérios de aceitação e 32 identificadores CT previstos (com execuções múltiplas em alguns casos).

**Registro de método:** esta matriz foi preparada com leitura do contrato arquitetural e do código-fonte. A IA apoiou a redação da tabela; ela não foi apresentada como contexto à geração da suíte v1. As colunas v1/v2 foram conferidas pela leitura dos testes e os resultados da execução foram confirmados pela CI. Nenhuma medição é presumida.

## Próximos passos na ordem de avaliação

1. Preservar este commit anterior à v1.
2. Gerar a v1 somente com histórias/critérios e código, sem fornecer esta matriz como prompt.
3. Comparar testes existentes com os CTs, executar ferramentas e atualizar as colunas.
4. Corrigir lacunas na v2 sem modificar o conteúdo da v1.
