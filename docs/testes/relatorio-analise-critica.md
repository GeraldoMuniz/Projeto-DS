# Sprint 3 — Relatório de análise crítica da suíte de testes

**Projeto:** Gerinfra CIn-UFPE • **Data:** 12/11/2026  
**Stack:** NestJS 11, TypeScript, Vitest 4, V8 e GitHub Actions.  
**LLM:** ChatGPT GPT-6.  
**Escopo medido:** exclusivamente `gerinfra/gerinfra-back/src/modules/tickets/ticket.policy.ts`.  
**Evidência:** [execução CI 43231202899](https://github.com/GeraldoMuniz/Projeto-DS/actions/runs/43231202899), com artefato `sprint3-cobertura`.

## 1. Contexto e seleção

As seis histórias pedagógicas US01–US06 agrupam os requisitos implementados na Sprint 2 relativos a chamados: controle de acesso, alocação, progresso, conclusão, retorno/fechamento, mensagens/prioridades/concorrência. Foram extraídos 25 critérios de aceitação da arquitetura e 32 casos CT de referência da matriz de rastreabilidade. Os códigos US/CT são usados neste trabalho, não afirmados como IDs originais do backlog.

## 2. Projeto manual

A matriz foi registrada primeiro (commit `434dd48`), antes do commit da v1 (`7193918`). Inclui classes válidas e inválidas de papel, equipe, estado, resultado, audiência e versão. Limites explícitos verificados na v2: versões -1, 0, 1, 1.5 e 2, feedback com espaços e comprimentos 0, 1, 5000 e 5001 caracteres. São 10 valores de fronteira distintamente inspecionados.

## 3. Geração e execução

A v1 foi gerada em uma rodada, preservada sem edição manual, com 12 testes. Uma nova rodada gerou a v2, ampliada e corrigida em seu próprio diretório (49 testes parametrizados computados pelo executor). A v2 não altera a v1. Nenhum teste precisou ser comentado para execução. O arquivo `docs/testes/llm-log.md` registra o procedimento e prompts reproduzíveis, identificados como reconstruções operacionais e não como transcrições de mensagens isoladas.

## 4. Indicadores medidos

| Indicador | v1 — LLM | v2 — revista |
|---|---:|---:|
| Testes executados | 12 | 49 |
| Testes passando | 12 | 49 |
| Falhando | 0 | 0 |
| Sem compilar | 0 | 0 |
| Cobertura de linhas (V8) | 88,40% | 98,55% |
| Cobertura de branches (V8) | 70,12% | 97,40% |
| Cobertura dos 25 critérios (inspeção) | 12/25 = 48% | 25/25 = 100% |
| Casos CT de referência presentes (inspeção) | 12/32 = 37,50% | 32/32 = 100% |
| Valores de fronteira destacados (inspeção) | 2/10 = 20% | 10/10 = 100% |
| Testes sem asserção ou triviais (inspeção) | 0 | 0 |
| Defeitos reais demonstrados | 0 | 0 |

As métricas de execução e cobertura são da CI. Cobertura de critérios, CTs e limites resulta da conferência manual dos arquivos de teste em relação à matriz, não de contador automático da ferramenta. O total de 29 testes já existentes também passou na mesma execução. Não foram executados testes E2E com banco nesta medição; isso não significa ausência de defeitos no sistema inteiro.

## 5. Análise crítica

**Partições e limites.** A LLM acertou as categorias principais: perfil (gestor, equipe, usuário), andamento, conclusão, retorno, mensagem, prioridade e versão. Contudo, a v1 quase não explorou entradas inválidas: só um estado de progresso, um resultado de conclusão e um teste com versão obsoleta. A v2 acrescentou resultados de sucesso e fracasso, equipe indevida, gestor exclusivo, feedback ausente e espaços, estado terminal e limites do DTO Zod.

**Critérios de aceitação.** Na inspeção de rastreabilidade, a v1 exerceu diretamente 12 dos 25 critérios selecionados. A v2 exercitou todos os 25. Os testes se mantiveram associados às histórias selecionadas; não foi identificado caso claramente sem requisito relacionado.

**Linhas versus branches.** A v1 alcançou 88,40% das linhas, mas apenas 70,12% dos branches: executar as linhas que validam conclusão bem-sucedida não exercita necessariamente a alternativa `SEM_SUCESSO` nem a ausência de `outcome`. A verificação de `if (!dto.outcome)` pode ter a linha executada no caminho válido sem ter o ramo de erro exercitado. A v2 testa essas alternativas e eleva a cobertura de branches a 97,40%, diferença de 27,28 pontos percentuais.

**Oráculos e asserções.** Todos os testes da v1 e da v2 inspecionados possuem asserções úteis; nenhum teste sem asserção foi identificado. As expectativas foram comparadas à documentação de estados/ações e a enumeração de resultados, não apenas ao resultado atual da implementação. Não se demonstrou teste que passasse confirmando defeito real. Não foram encontrados erros de importação na CI.

## 6. Melhorias da v2

- Testes de autoria e isolamento por perfil, inclusive identidade/equipe ausentes.
- Casos negativos de autorização e transições inválidas para chamados retornados ou concluídos.
- Resultado explícito e feedback obrigatório, inclusive espaços em branco.
- Limites numéricos de versão e fronteiras de comprimento do texto, exercitando o validador.
- Asserções sobre `closedAt`, incremento de versão e ausência de campos de conclusão em retorno.

Os relatórios HTML completos produzidos pela ferramenta estão disponíveis como artefato da execução do GitHub Actions. As coberturas abrangem apenas a política de chamados selecionada, evitando diluição pela API inteira.

## 7. Conclusão

O uso da LLM acelerou a criação de cenários corretos e executáveis, mas a primeira versão não forneceu cobertura funcional suficiente para confiar isoladamente no comportamento. Em trabalhos futuros, a equipe pode usar IA para gerar testes, desde que defina o gabarito de requisitos antes, mantenha a geração original preservada, confira oráculos e use métricas de branches, linhas e limites para direcionar a melhoria. A principal limitação do experimento é o escopo restrito à política de chamados, sem teste de banco nesta sprint.
