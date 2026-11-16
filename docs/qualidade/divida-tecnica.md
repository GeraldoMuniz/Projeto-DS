# Relatório de dívida técnica — Gerinfra / Sprint 3

**Data:** 12/11/2026 (validação manual registrada em 15/11/2026).  
**Fonte:** GitHub `GeraldoMuniz/Projeto-DS` (branches `main` e `sprint3-testes-qualidade-2026`).  
**Escopo analisado:** `ticket.policy.ts`, `ticket.dto.ts`, `ticket.service.ts` e `periodic.service.ts` (sob `gerinfra/gerinfra-back`), com apoio de `docs/ARQUITETURA.md` como contexto arquitetural.

Os achados iniciais foram levantados por inspeção do código com apoio do ChatGPT (GPT-6) e posteriormente conferidos manualmente no código-fonte por Gabriel Andrade (6 itens confirmados integralmente e 2 ajustados quanto à descrição/classificação). O histórico documenta as três refatorações aplicadas e o plano de pagamento dos cinco itens mantidos em aberto.

| ID | Arquivo / função | Problema | Categoria | Consequência | Origem | Status |
|---|---|---|---|---|---|---|
| DT-01 | `src/modules/tickets/ticket.policy.ts` — `ticketChange` | Validação de texto obrigatório duplicada em `COMPLETE`/`RETURN`/`CLOSE` | Duplicated Code; SRP; coesão | Alterações no modo de validar feedback teriam de ser replicadas em caminhos diferentes, aumentando risco de mensagens ou regras inconsistentes. | Inspeção com LLM; confirmado manualmente no código | Refatorado |
| DT-02 | `src/modules/tickets/ticket.policy.ts` — `ticketChange` | Atribuições de conclusão repetidas em `COMPLETE`/`CLOSE` | Duplicated Code; integridade conceitual | Data de encerramento, status, resultado e feedback podem divergir entre encerramento por equipe e por gestor. | Inspeção com LLM; confirmado manualmente no código | Refatorado |
| DT-03 | `src/modules/tickets/ticket.policy.ts` — `ticketChange` | Lista literal de estados operáveis embutida em validação | Magic Numbers (Magic Literals); integridade conceitual | Adicionar ou revisar estados exigia alterar uma lista sem nome no fluxo da função, obscurecendo a regra de domínio. | Inspeção com LLM; confirmado manualmente no código | Refatorado |
| DT-04 | `src/modules/tickets/ticket.policy.ts` — `ticketChange` | Uma função grande executa validação, autorização, transições, atualização e mensagens de sete ações | Long Method; baixa coesão; SRP | Mudanças numa ação podem afetar logicamente outras ações; há muitos caminhos para revisar e testar. | Inspeção com LLM; confirmado manualmente no código | Aberto |
| DT-05 | `src/modules/tickets/dto/ticket.dto.ts` — `TicketActionDto` | DTO de ação único tem seis campos opcionais compartilhados entre sete operações distintas | Baixa coesão; integridade conceitual; ISP | O schema aceita ações sem campos obrigatórios por operação, obrigando a política de domínio a suprir a validação estrutural da entrada. | Inspeção com LLM; ajustado após revisão manual no código | Aberto |
| DT-06 | `src/modules/tickets/ticket.service.ts` — `action` | Serviço mistura persistência transacional com formatação do rótulo de autoria (`sender`) da mensagem | SRP; acoplamento; integridade conceitual | A montagem da mensagem fica dividida entre `ticket.policy.ts` e `ticket.service.ts`, e mudanças na exibição de autores exigem alterar o método de transação do banco. | Inspeção com LLM; ajustado após revisão manual no código | Aberto |
| DT-07 | `src/modules/periodic/periodic.service.ts` — `generate` | Método reúne verificação de papel, concorrência, duplicidade e criação de mensagens/chamados | Long Method; SRP; alta complexidade | Mudanças na política de concorrência e nas regras de geração exigem revisão de um único fluxo transacional extenso. | Inspeção com LLM; confirmado manualmente no código | Aberto |
| DT-08 | `src/modules/periodic/periodic.service.ts` — `create`/`update`/`request` | Conversão de datas para `Date` (e formatação ISO) aparece em múltiplos caminhos | Duplicated Code; integridade conceitual | Correções futuras de interpretação de data de calendário ou fuso horário podem ser aplicadas apenas a uma das operações. | Inspeção com LLM; confirmado manualmente no código | Aberto |

## Validação manual dos achados

| ID | Decisão | Evidência no código e justificativa |
|---|---|---|
| DT-01 | **Confirmado** | Verificado em `ticket.policy.ts` (`ticketChange`): a checagem `!text?.trim()` repetia-se nos três fluxos de texto obrigatório e foi centralizada em `requireFeedback(text, message)` sem alterar as mensagens de erro. |
| DT-02 | **Confirmado** | Verificado em `ticket.policy.ts` (`COMPLETE` e `CLOSE`): ambos os caminhos atualizavam `status`, `feedback`, `outcome` e `closedAt` separadamente; a extração de `applyConclusion` garantiu uniformidade no encerramento. |
| DT-03 | **Confirmado** | Verificado em `ticket.policy.ts`: o array literal `['ACOMPANHAMENTO', 'EM_ANALISE', 'EM_ANDAMENTO']` estava embutido na guarda de ações da equipe e foi substituído pela constante `TEAM_ACTIVE_STATUSES`. |
| DT-04 | **Confirmado** | Verificado em `ticket.policy.ts` (linhas 30–106): `ticketChange` concentra um `switch (dto.action)` com 7 casos, acumulando autorização, máquina de estados, montagem de mutação Prisma e redação de mensagens. |
| DT-05 | **Ajustado** | Confirmado em `TicketActionDto` (`ticket.dto.ts`, linhas 16–35) que `team`, `status`, `outcome`, `text`, `urgency` e `audience` são todos `.optional()`. Ajustou-se apenas a categoria para **Baixa coesão; integridade conceitual; ISP**, alinhando o diagnóstico aos princípios da disciplina. |
| DT-06 | **Ajustado** | Na revisão de `TicketService.action` (`ticket.service.ts`, linhas 59–82), constatou-se que a política de acesso já está isolada em `ticketScope` e `ticketChange`. Ajustou-se o diagnóstico para apontar o problema real: a formatação inline de `sender` (`'Gestor Gerinfra'` vs. `'Equipe ...'`) dentro da transação de persistência. |
| DT-07 | **Confirmado** | Verificado em `PeriodicService.generate` (`periodic.service.ts`, linhas 72–123): o método encadeia validação de admin, checagem de unicidade, lock otimista por `version`, criação de chamado/mensagem e tratamento de erro `P2002` do Prisma. |
| DT-08 | **Confirmado** | Verificado em `periodic.service.ts`: `new Date(dto.date)` repete-se em `create`, `update` e `request` (linhas 50, 58 e 143), além de `.toISOString().slice(0, 10)` em `serialize` e `generate`. |

### Princípios avaliados e descartados (sem evidência no código)

Durante a análise conjunta com a LLM e a conferência manual, três princípios foram verificados e descartados do registro de dívida:

- **LSP (Liskov Substitution Principle):** não há hierarquia de subtipos relevante nos módulos analisados que comprove violação.
- **DIP (Dependency Inversion Principle):** `TicketService` recebe `PrismaService` por injeção, mas a dependência de uma classe concreta, isoladamente, não comprova impacto material suficiente para registro como dívida prioritária.
- **Information hiding:** não foi identificado acesso externo direto a campos internos privados de classes nos módulos analisados.

## Critério de prioridade e escolha

- **DT-01** — priorizado porque as três ações dependem de texto obrigatório, e centralizá-lo evita divergência sem alterar o contrato.
- **DT-02** — priorizado porque concluir chamado precisa persistir exatamente os mesmos campos independentemente de quem encerra.
- **DT-03** — priorizado para nomear uma regra explícita de negócio mantendo as transições permitidas.

## Refatorações aplicadas

- **DT-01:** extração de `requireFeedback` no commit [`5171bcf`](https://github.com/GeraldoMuniz/Projeto-DS/commit/5171bcf).
- **DT-02:** extração de `applyConclusion` no commit [`a0803db`](https://github.com/GeraldoMuniz/Projeto-DS/commit/a0803db).
- **DT-03:** introdução da constante `TEAM_ACTIVE_STATUSES` no commit [`62dc836`](https://github.com/GeraldoMuniz/Projeto-DS/commit/62dc836).

Os resultados da v2 para cada commit estão no [relatório de refatoração](relatorio-refatoracao.md#testes-antes-e-depois) e na [execução da CI](https://github.com/GeraldoMuniz/Projeto-DS/actions/runs/43233016036).

## Plano proposto para os itens abertos

| ID | Prioridade proposta | Ação de pagamento | Momento proposto |
|---|---|---|---|
| DT-04 | Alta | Extrair as regras por ação de `ticketChange`, mantendo as validações compartilhadas e os resultados cobertos pela v2. | Próximo ciclo de manutenção de chamados. |
| DT-05 | Média | Avaliar schemas discriminados por ação (`z.discriminatedUnion`) e cobrir a compatibilidade dos erros da API antes de mover validações da política para o DTO. | Após DT-04, na próxima revisão do contrato de chamados. |
| DT-06 | Média | Extrair a montagem dos dados de autoria da mensagem (`sender`) para fora da transação e testar a gravação junto à alteração do chamado. | Na próxima mudança de mensagens ou histórico de chamados. |
| DT-07 | Alta | Extrair as verificações de geração em etapas, preservando a transação. Cobrir conflito de versão e duplicidade com testes de integração. | No próximo ciclo de manutenção de periódicas. |
| DT-08 | Baixa | Centralizar a conversão da data nos fluxos de criação, edição e solicitação e testar datas de calendário nos três pontos. | Após DT-07 ou na próxima alteração das regras de data. |

## Princípios observados e método de análise

**Propriedades de projeto:** coesão, acoplamento e integridade conceitual (descartado: *information hiding*).  
**SOLID:** responsabilidade única (SRP) e segregação de interfaces (ISP) (descartados: LSP e DIP).  
**Code smells:** Duplicated Code, Long Method e Magic Numbers (Magic Literals).  
**Método e ferramentas:** leitura do repositório via conector GitHub e inspeção com ChatGPT (GPT-6), com validação de testes, lint e compilação via Vitest e [GitHub Actions](https://github.com/GeraldoMuniz/Projeto-DS/actions/runs/43233016036). Não foram executadas ferramentas de análise estática (SonarQube, ESLint SonarJS, jscpd ou madge). Os prompts e registros completos estão no [log de qualidade](log-analise.md).