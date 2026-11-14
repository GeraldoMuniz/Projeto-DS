# Sprint 3 — Relatório de análise crítica da suíte de testes

**Projeto:** Gerinfra CIn-UFPE • **Data:** 12/11/2026  
**Stack:** NestJS 11, TypeScript, Vitest 4, V8 e GitHub Actions.  
**LLM:** ChatGPT GPT-6.  
**Escopo medido:** exclusivamente `gerinfra/gerinfra-back/src/modules/tickets/ticket.policy.ts`.  
**Evidência:** [execução no GitHub Actions](https://github.com/GeraldoMuniz/Projeto-DS/actions/runs/43233016036), [cobertura v1](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/docs/testes/relatorios/v1/index.html) e [cobertura v2](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/docs/testes/relatorios/v2/index.html).

## 1. Contexto e seleção

As seis histórias pedagógicas US01–US06 agrupam os requisitos implementados na Sprint 2 relativos a chamados: controle de acesso, alocação, progresso, conclusão, retorno/fechamento, mensagens/prioridades/concorrência. Foram extraídos 25 critérios de aceitação da arquitetura e 32 casos CT de referência da matriz de rastreabilidade. Os códigos US/CT são usados neste trabalho, não afirmados como IDs originais do backlog.

## 2. Projeto manual

A matriz foi registrada no commit `434dd48`, antes da v1 (`7193918`). Inclui classes válidas e inválidas de papel, equipe, estado, resultado, audiência e versão. A inspeção considerou dez entradas de referência para limites e validações de entrada: versões -1, 0, 1, 1.5 e 2, feedback só com espaços e textos com 0, 1, 5000 e 5001 caracteres.

## 3. Geração e execução

A v1 foi gerada em uma rodada e preservada sem edição manual, com 12 testes. Outra rodada gerou a v2, que recebeu uma correção de tipagem e executou 49 casos, contando as entradas de testes parametrizados. Nenhum teste precisou ser comentado para execução. O log registra reconstruções dos prompts operacionais.

## 4. Indicadores medidos

| Indicador | v1 — LLM | v2 — revista |
|---|---:|---:|
| Testes executados | 12 | 49 |
| Testes passando | 12 | 49 |
| Falhando | 0 | 0 |
| Sem compilar | 0 | 0 |
| Cobertura de linhas (V8) | 88,40% | 98,55% |
| Cobertura de branches (V8) | 70,12% | 97,40% |
| Critérios exercitados, inclusive parcialmente | 12/25 = 48% | 25/25 = 100% |
| Critérios verificados integralmente | 4/25 = 16% | 24/25 = 96% |
| Casos de referência verificados integralmente | 9/32 = 28,13% | 31/32 = 96,88% |
| Entradas de referência para limites e validações | 2/10 = 20% | 10/10 = 100% |
| Testes sem asserção ou triviais (inspeção) | 0 | 0 |
| Defeitos reais demonstrados | 0 | 0 |

A CI mediu a cobertura de `ticket.policy.ts`. A conferência das asserções contra a matriz produziu os indicadores funcionais, incluindo os casos do DTO. Os testes com banco ficaram fora dessa medição.

## 5. Análise crítica

**Partições e limites.** A v1 cobriu os três perfis de consulta e exercitou casos inválidos de feedback ausente e versão divergente. Para progresso, exercitou apenas `EM_ANALISE`. Para `COMPLETE`, exercitou apenas `SUCESSO` como resultado válido. A v2 incluiu `EM_ANDAMENTO`, `COMPLETE` com `SEM_SUCESSO`, equipe indevida, estado terminal e as fronteiras de tamanho do texto no DTO.

**Critérios de aceitação.** A v2 exercitou todos os 25 critérios, 24 integralmente. O fechamento administrativo de chamado retornado foi verificado nas duas suítes com `SEM_SUCESSO`. O CT22 especifica `SUCESSO`, que ficou sem verificação nesse cenário. Os testes adicionais do DTO se relacionam às validações de versões, resultados e urgências previstas nas histórias selecionadas.

**Linhas versus branches.** Na v1, `COMPLETE` com `SUCESSO` executa a condição `if (!dto.outcome)` sem percorrer o ramo que lança a exceção. A v2 exercitou esse ramo no CT18 e incluiu `COMPLETE` com `SEM_SUCESSO`. No módulo medido, a cobertura de branches aumentou 27,28 pontos percentuais.

**Oráculos e asserções.** Todos os testes inspecionados contêm asserções. No CT30, a v1 aceita qualquer erro com `toThrow()`. A v2 exige `ConflictException`, que distingue o conflito de versão de outros erros da ação. A inspeção não identificou teste que aprovasse um defeito real.

## 6. Melhorias da v2

- Testes de escopo e permissões por perfil, inclusive identidade ou equipe ausentes.
- Casos negativos de autorização e transições inválidas para chamados retornados ou concluídos.
- Resultado explícito e feedback obrigatório, inclusive espaços em branco.
- Limites numéricos de versão e fronteiras de comprimento do texto, exercitando o validador.
- Asserções sobre `closedAt`, incremento de versão e ausência de campos de conclusão em retorno.

## 7. Conclusão

A LLM pode gerar uma primeira suíte para regras com critérios de aceitação explícitos. No Gerinfra, a primeira versão executou todos os seus testes, mas verificou integralmente apenas quatro dos 25 critérios. Antes de usar uma suíte gerada como proteção para refatorar, a equipe pode preservar a versão original, conferir os resultados esperados contra o contrato e usar a matriz e a cobertura de branches para escolher os casos que faltam.

## Apêndices

- [Log de interação com a LLM](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/docs/testes/llm-log.md)
- [Matriz de rastreabilidade](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/docs/testes/matriz-rastreabilidade.md)
