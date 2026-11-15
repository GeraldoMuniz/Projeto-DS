# Sprint 3 — Matriz de rastreabilidade (projeto manual)

**Sistema:** Gerinfra CIn-UFPE — API NestJS/TypeScript.
**Escopo:** `gerinfra/gerinfra-back/src/modules/tickets/ticket.policy.ts` e `gerinfra/gerinfra-back/src/modules/tickets/dto/ticket.dto.ts`.
**Origem:** funcionalidades implementadas de chamados documentadas em `gerinfra/docs/ARQUITETURA.md`; os identificadores US01–US06 são uma organização desta atividade, não códigos originais comprovados da Sprint 2.
**Primeira versão:** 12/11/2026, registrada antes da suíte v1. **Autoria metodológica:** matriz redigida com apoio do mesmo ChatGPT que gerou a v1, no mesmo contexto. A ordem dos commits não comprova independência entre o projeto manual e a geração por IA.

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
| US05-CA2 | Fechamento administrativo | ADMIN + RETORNADO | CT22: CLOSE/SUCESSO com feedback → CONCLUIDO | Parcial | Sim |
| US05-CA3 | Estado prévio requerido | ACOMPANHAMENTO | CT23: CLOSE fora de RETORNADO → ConflictException | Não | Sim |
| US05-CA4 | Gestor exclusivo | TEAM em RETORNADO | CT24: TEAM+CLOSE → ForbiddenException | Não | Sim |
| US06-CA1 | Mensagem autorizada | gestor e equipe | CT25: ADMIN MESSAGE/TEAM; CT26: TEAM MESSAGE/REQUESTER | Parcial | Sim |
| US06-CA2 | Audiência restrita | equipe tenta TEAM | CT27: TEAM MESSAGE/TEAM → ForbiddenException | Não | Sim |
| US06-CA3 | Prioridade válida e obrigatória | com/sem urgency | CT28: PRIORITY URGENTE → altera; CT29: sem urgency → erro | Parcial | Sim |
| US06-CA4 | Versão otimista | v=1 e v=2 | CT30: versão divergente → ConflictException; CT31: versão igual → incrementa | Parcial | Sim |
| US06-CA5 | Chamado concluído | estado terminal | CT32: MESSAGE em CONCLUIDO → ConflictException | Não | Sim |

## Cobertura de partições de equivalência

A unidade de contagem é uma classe de entrada no contexto da regra testada. `COMPLETE` e `CLOSE`, por exemplo, são ações distintas. Os identificadores CT remetem aos cenários da matriz acima. O CT19 verifica a data de encerramento e reutiliza uma entrada válida de `COMPLETE`, já contada no CT14 ou no CT15. A contagem inclui também três classes explicitadas nesta revisão: fechamento com `SEM_SUCESSO`, resultado fora do enum e urgência fora do enum.

| História | Partições consideradas | Exercitadas na v1 | Exercitadas na v2 |
|---|---|---|---|
| US01 | CT01–CT05 (5) | CT01–CT03 (3/5) | Todas (5/5) |
| US02 | CT06–CT09 (4) | CT06 (1/4) | Todas (4/4) |
| US03 | CT10–CT13 (4) | CT10 (1/4) | Todas (4/4) |
| US04 | CT14–CT18 e resultado fora do enum no DTO (6) | CT14 e CT16 (2/6) | Todas (6/6) |
| US05 | CT20–CT24 e fechamento com `SEM_SUCESSO` (6) | CT21 e fechamento com `SEM_SUCESSO` (2/6) | Todas (6/6) |
| US06 | CT25–CT32 e urgência fora do enum no DTO (9) | CT25, CT28 e CT30 (3/9) | Todas (9/9) |
| **Total** | **34 partições** | **12/34 (35,29%)** | **34/34 (100%)** |

Uma partição é exercitada quando a suíte fornece uma entrada daquela classe e verifica um efeito associado. A coluna de casos de referência também exige todos os resultados esperados do caso. Por exemplo, o CT30 exercita a versão divergente na v1, mas a asserção aceita qualquer exceção.

## Análise explícita dos limites

- **Versão:** a v2 testou as versões `1` e `2` na política do chamado. No DTO, confirmou a rejeição de `-1` e `1.5` e a aceitação de `0` e `2`.
- **Tamanho de feedback/mensagem:** na política, a v2 testou feedback ausente, composto só por espaços e preenchido. No DTO, confirmou que textos com 1 e 5000 caracteres são aceitos e que textos com 0 e 5001 caracteres são rejeitados.
- **Status do chamado:** pré-condições válidas `ACOMPANHAMENTO`, `EM_ANALISE`, `EM_ANDAMENTO` e inválidas `RETORNADO`, `CONCLUIDO` por ação.
- **Resultado:** partições `SUCESSO`, `SEM_SUCESSO` e ausente; valor diferente dos permitidos deve ser barrado pelo DTO.
- **Equipes:** uma especialidade válida, equipe ausente e equipe distinta da responsável.
- **Urgência:** `URGENTE`, `MODERADO`, `LEVE` e ausente; fora do enum deve ser rejeitado no DTO.

**Inspeção das suítes:** a v1 exercita pelo menos um cenário de 12 dos 25 critérios e a v2 verifica os 25 integralmente. **Parcial** indica que a suíte verifica apenas parte dos cenários ou das condições esperadas para o critério. A v1 verifica o fechamento com `SEM_SUCESSO`. A v2 mantém esse cenário e acrescenta o CT22 com `SUCESSO`.

**Casos de referência verificados integralmente:** 9 de 32 na v1 (CT01, CT02, CT03, CT06, CT10, CT14, CT21, CT25 e CT28) e 32 de 32 na v2. A v1 confirma a mensagem de erro no CT16, porém não o tipo da exceção, e aceita qualquer exceção no CT30. Ambos foram contados como parciais na v1.

**Método e limitação:** a matriz foi preparada a partir do contrato de arquitetura e do código-fonte, com apoio da IA na redação. A v1 foi gerada na mesma conversa pelo mesmo assistente, que já tinha acesso à matriz. Por isso, não se afirma que a IA desconhecia a matriz ou que o projeto da matriz foi elaborado de modo independente por humanos. As colunas v1 e v2 registram a inspeção dos testes em relação aos critérios; os indicadores de execução constam do relatório de análise crítica.
