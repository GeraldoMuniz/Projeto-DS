# Sprint 3 — Relatório de refatoração

**Projeto:** Gerinfra CIn-UFPE • **Data:** 12/11/2026  
**Escopo:** `gerinfra/gerinfra-back/src/modules/tickets/ticket.policy.ts`  
**Base de testes:** `tests/v2/ticket.policy.test.ts` (49 testes) e testes existentes do backend (29).  
**Execução de referência:** [GitHub Actions](https://github.com/GeraldoMuniz/Projeto-DS/actions/runs/43233016036).

## DT-01 — Extrair validação de feedback obrigatório

**Commit:** [`5171bcf`](https://github.com/GeraldoMuniz/Projeto-DS/commit/5171bcf) — `refactor(DT-01): centralizar validação de feedback obrigatório`.

**Antes:** as ações `COMPLETE`, `RETURN` e `CLOSE` repetiam o teste de texto vazio, com mensagens distintas.

**Depois:** foi criada a função `requireFeedback(text, message)` e os caminhos invocam a função com a mesma mensagem que já utilizavam.

**Refatoração:** Extract Function. **Melhora:** duplicação e coesão. **Risco controlado:** as mensagens específicas e o uso de `trim()` foram preservados.

## DT-02 — Unificar atualização de conclusão

**Commit:** [`a0803db`](https://github.com/GeraldoMuniz/Projeto-DS/commit/a0803db) — `refactor(DT-02): extrair atualização comum de conclusão`.

**Antes:** tanto `COMPLETE` quanto `CLOSE` definiam `CONCLUIDO`, `feedback`, `outcome` e `closedAt` em blocos duplicados.

**Depois:** a função `applyConclusion(data, dto)` concentra as atribuições. A autorização, verificação do estado retornado e texto da mensagem continuam nos respectivos fluxos.

**Refatoração:** Extract Function. **Melhora:** consistência e integridade conceitual, reduzindo divergência de campos de encerramento.

## DT-03 — Nomear estados ativos de atendimento

**Commit:** [`62dc836`](https://github.com/GeraldoMuniz/Projeto-DS/commit/62dc836) — `refactor(DT-03): nomear estados ativos de atendimento`.

**Antes:** o teste de permissão para evoluir, concluir ou retornar continha a lista literal `['ACOMPANHAMENTO', 'EM_ANALISE', 'EM_ANDAMENTO']`.

**Depois:** a constante `TEAM_ACTIVE_STATUSES` define os três estados em um lugar identificado.

**Refatoração:** Replace Magic Literal with Named Constant. **Melhora:** legibilidade de regra de negócio e coerência entre transições.

## Testes antes e depois

A v2 foi reexecutada localmente em 14/11/2026 com Vitest 4.1.8 nos commits históricos. A comparação abaixo registra essas reexecuções posteriores.

| Item | Commit anterior | Resultado antes | Commit da refatoração | Resultado depois |
|---|---|---:|---|---:|
| DT-01 | `be5f322` | 49/49 | `5171bcf` | 49/49 |
| DT-02 | `5171bcf` | 49/49 | `a0803db` | 49/49 |
| DT-03 | `a0803db` | 49/49 | `62dc836` | 49/49 |

No estado refatorado, a CI também registrou 12/12 testes da v1 e 29/29 testes preexistentes aprovados.

## Comparação dos métodos de identificação

A análise assistida por LLM apontou a duplicação das atualizações de conclusão (DT-02) e a concentração de responsabilidades em `ticketChange` (DT-04). A leitura do contrato e do diff de DT-02 distinguiu os campos de conclusão compartilhados das regras específicas de cada ação. A autorização da equipe continuou em `COMPLETE`, e a exigência de chamado retornado continuou em `CLOSE`. O Vitest verificou esses cenários nas reexecuções da v2.
