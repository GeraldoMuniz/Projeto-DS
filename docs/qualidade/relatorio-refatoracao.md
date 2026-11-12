# Sprint 3 — Relatório de refatoração

**Projeto:** Gerinfra CIn-UFPE • **Data:** 12/11/2026  
**Escopo:** `gerinfra/gerinfra-back/src/modules/tickets/ticket.policy.ts`  
**Base de testes:** `tests/v2/ticket.policy.test.ts` (49 testes) e testes existentes do backend (29).  
**Execução de referência:** [GitHub Actions](https://github.com/GeraldoMuniz/Projeto-DS/actions/runs/43231202899).

## DT-01 — Extrair validação de feedback obrigatório

**Commit:** `5171bcf` — `refactor(DT-01): centralizar validação de feedback obrigatório`.

**Antes:** as ações `COMPLETE`, `RETURN` e `CLOSE` repetiam o teste de texto vazio, com mensagens distintas.

**Depois:** foi criada a função `requireFeedback(text, message)` e os caminhos invocam a função com a mesma mensagem que já utilizavam.

**Refatoração:** Extract Function. **Melhora:** duplicação e coesão. **Risco controlado:** as mensagens específicas e o uso de `trim()` foram preservados.

## DT-02 — Unificar atualização de conclusão

**Commit:** `a0803db` — `refactor(DT-02): extrair atualização comum de conclusão`.

**Antes:** tanto `COMPLETE` quanto `CLOSE` definiam `CONCLUIDO`, `feedback`, `outcome` e `closedAt` em blocos duplicados.

**Depois:** a função `applyConclusion(data, dto)` concentra as atribuições. A autorização, verificação do estado retornado e texto da mensagem continuam nos respectivos fluxos.

**Refatoração:** Extract Function. **Melhora:** consistência e integridade conceitual, reduzindo divergência de campos de encerramento.

## DT-03 — Nomear estados ativos de atendimento

**Commit:** `62dc836` — `refactor(DT-03): nomear estados ativos de atendimento`.

**Antes:** o teste de permissão para evoluir, concluir ou retornar continha a lista literal `['ACOMPANHAMENTO', 'EM_ANALISE', 'EM_ANDAMENTO']`.

**Depois:** a constante `TEAM_ACTIVE_STATUSES` define os três estados em um lugar identificado.

**Refatoração:** Replace Magic Literal with Named Constant. **Melhora:** legibilidade de regra de negócio e coerência entre transições.

## Testes antes e depois

A suíte v2 foi criada antes do primeiro commit de refatoração. **Limite da evidência:** não há execução CI arquivada imediatamente antes de DT-01, portanto não se afirma uma medição de execução daquele instante. Após as três refatorações, o workflow reportou **49/49 testes v2**, **12/12 testes v1** e **29/29 testes preexistentes** passando. A cobertura da política de chamados pela v2 no estado refatorado foi **98,55% de linhas e 97,40% de branches**.

Esses resultados apoiam a preservação de comportamento nos cenários cobertos; não são prova absoluta de equivalência para caminhos sem testes. A documentação registra explicitamente a diferença entre o esperado e o que foi medido.

## Comparação dos métodos de identificação

A inspeção assistida por LLM destacou padrões semânticos que regras simples de lint nem sempre detectam, especialmente a duplicação de efeitos de conclusão (DT-02) e responsabilidades misturadas (DT-04). Uma leitura manual do contrato e do fluxo foi necessária para avaliar riscos e evitar alterações de comportamento. A CI/Vitest forneceu evidências automatizadas de execução, mas não classificou por si mesma violações de SRP ou duplicação. Nenhuma análise por SonarQube, jscpd ou madge foi executada, e não se atribuem achados a elas. A equipe deve confirmar os diagnósticos restantes do relatório de dívida técnica.
