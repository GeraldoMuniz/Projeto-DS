# Sprint 3 — Relatório de análise crítica da suíte de testes

**Projeto:** Gerinfra CIn-UFPE • **Data:** 12/11/2026  
**Stack:** NestJS 11, TypeScript, Vitest 4, V8 e GitHub Actions.  
**LLM:** ChatGPT GPT-6.  
**Escopo medido:** exclusivamente `gerinfra/gerinfra-back/src/modules/tickets/ticket.policy.ts`.  
**Evidência:** [execução inicial no GitHub Actions](https://github.com/GeraldoMuniz/Projeto-DS/actions/runs/43233016036), [cobertura v1](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/docs/testes/relatorios/v1/index.html) e [cobertura v2](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/docs/testes/relatorios/v2/index.html).

## 1. Contexto e seleção

As seis histórias pedagógicas US01–US06 agrupam os requisitos implementados na Sprint 2 relativos a chamados: controle de acesso, alocação, progresso, conclusão, retorno/fechamento, mensagens/prioridades/concorrência. Foram extraídos 25 critérios de aceitação da arquitetura e 32 casos CT de referência da matriz de rastreabilidade. Os códigos US/CT são usados neste trabalho, não afirmados como IDs originais do backlog.

## 2. Projeto manual

A matriz foi registrada no commit `434dd48`, antes da v1 (`7193918`). **Entretanto, a matriz e os testes foram produzidos com apoio do mesmo ChatGPT, na mesma conversa; a anterioridade do commit não comprova elaboração independente pela equipe nem desconhecimento da matriz pela IA.** A revisão explicita a contagem por história das 34 partições de equivalência. A inspeção considerou também dez entradas de referência para limites e validações: versões -1, 0, 1, 1.5 e 2, feedback só com espaços e textos com 0, 1, 5000 e 5001 caracteres.

## 3. Geração e execução

A v1 de 12 testes foi gerada diretamente no fluxo de execução do ChatGPT, sem um prompt de testes independente do pedido geral do usuário. Seu arquivo original foi preservado sem edição. Depois, o mesmo assistente criou a v2, que recebeu uma correção de tipagem; a equipe acrescentou o CT22, totalizando 50 casos, contando os parametrizados. **O log foi corrigido para distinguir mensagens literais do usuário, ações observadas e reconstituições descritivas, sem simular uma conversa.**

## 4. Indicadores medidos

| Indicador | v1 — LLM | v2 — revista |
|---|---:|---:|
| Testes executados | 12 | 50 |
| Testes passando | 12 | 50 |
| Falhando | 0 | 0 |
| Sem compilar | 0 | 0 |
| Cobertura de linhas (V8) | 88,40% | 98,55% |
| Cobertura de branches (V8) | 70,12% | 98,70% |
| Critérios exercitados, inclusive parcialmente | 12/25 = 48% | 25/25 = 100% |
| Critérios verificados integralmente | 4/25 = 16% | 25/25 = 100% |
| Casos de referência verificados integralmente | 9/32 = 28,13% | 32/32 = 100% |
| Partições de equivalência cobertas | 12/34 = 35,29% | 34/34 = 100% |
| Entradas de referência para limites e validações | 2/10 = 20% | 10/10 = 100% |
| Testes sem asserção ou triviais (inspeção) | 0 | 0 |
| Defeitos reais demonstrados | 0 | 0 |

As duas suítes foram medidas localmente em 15/11/2026 com Vitest 4.1.8 e V8, no mesmo escopo de `ticket.policy.ts`. A inspeção dos testes contra a matriz produziu os indicadores funcionais, incluindo os casos do DTO. Os testes com banco ficaram fora dessa medição.

## 5. Análise crítica

**Partições e limites.** A v1 cobriu os três perfis de consulta e exercitou casos inválidos de feedback ausente e versão divergente. Para progresso, exercitou apenas `EM_ANALISE`. Para `COMPLETE`, exercitou apenas `SUCESSO` como resultado válido. A v2 incluiu `EM_ANDAMENTO`, `COMPLETE` com `SEM_SUCESSO`, equipe indevida, estado terminal e as fronteiras de tamanho do texto no DTO.

**Critérios de aceitação.** A v2 verifica integralmente os 25 critérios. A v1 verifica o fechamento administrativo de chamado retornado com `SEM_SUCESSO`. Na v2, o CT22 acrescenta o caso com `SUCESSO` e verifica o estado final, o resultado, o feedback e a mensagem de fechamento. Os testes adicionais do DTO se relacionam às validações de versões, resultados e urgências previstas nas histórias selecionadas.

**Linhas versus branches.** Na v1, `COMPLETE` com `SUCESSO` executa a condição `if (!dto.outcome)` sem percorrer o ramo que lança a exceção. A v2 exercita esse ramo no CT18. No `CLOSE`, o CT22 exerce o ramo que produz a mensagem de fechamento com sucesso. Isso elevou a cobertura da v2 de 75 para 76 dos 77 branches, mantendo 68 das 69 linhas cobertas. Em relação à v1, o ganho foi de 28,58 pontos percentuais em branches.

**Oráculos e asserções.** Todos os testes inspecionados contêm asserções. No CT30, a v1 aceita qualquer erro com `toThrow()`. A v2 exige `ConflictException`, que distingue o conflito de versão de outros erros da ação. A inspeção não identificou teste que aprovasse um defeito real.

## 6. Melhorias da v2

A v2 ampliou os testes de permissões, transições inválidas e limites do DTO. As asserções passaram a verificar o resultado, o feedback e a data de conclusão, o incremento de versão e a ausência de campos de conclusão no retorno. O CT22 acrescentou o fechamento administrativo com `SUCESSO` ao caso com `SEM_SUCESSO` já existente.

## 7. Conclusão

A LLM pode ajudar a criar uma primeira versão dos testes a partir dos critérios de aceitação. No Gerinfra, conseguimos executar todos os testes gerados, mas percebemos que eles cobriam completamente apenas 4 dos 25 critérios. **Essa comparação é limitada porque a mesma IA também auxiliou a produzir a matriz inicial, de modo que o experimento não comprova uma avaliação manual independente.** Por isso, antes de usar esses testes como garantia para fazer refatorações, precisamos comparar os resultados esperados com o que foi definido nos requisitos, guardar a versão original do código e analisar a matriz de cobertura e os branches para identificar o que ainda precisa ser testado.

## Apêndices

- [Log de interação com a LLM](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/docs/testes/llm-log.md)
- [Matriz de rastreabilidade](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/docs/testes/matriz-rastreabilidade.md)
