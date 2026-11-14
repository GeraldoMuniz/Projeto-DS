# Relatório de dívida técnica — Gerinfra / Sprint 3

**Data:** 12/11/2026. **Escopo analisado:** `ticket.policy.ts`, `ticket.dto.ts`, `ticket.service.ts` e `periodic.service.ts`, todos do backend.

Os achados foram registrados por inspeção do código com apoio do ChatGPT GPT-6. O histórico documenta as três refatorações aplicadas. A confirmação dos diagnósticos por integrantes da equipe segue sem registro.

| ID | Arquivo / função | Problema | Categoria | Consequência | Origem | Status |
|---|---|---|---|---|---|---|
| DT-01 | src/modules/tickets/ticket.policy.ts — ticketChange | Validação de texto obrigatório duplicada em COMPLETE/RETURN/CLOSE | Duplicated Code; SRP; coesão | Alterações no modo de validar feedback teriam de ser replicadas em caminhos diferentes, aumentando risco de mensagens ou regras inconsistentes. | Inspeção do código com apoio da LLM | Refatorado |
| DT-02 | src/modules/tickets/ticket.policy.ts — ticketChange | Atribuições de conclusão repetidas em COMPLETE/CLOSE | Duplicated Code; integridade conceitual | Data de encerramento, status, resultado e feedback podem divergir entre encerramento por equipe e por gestor. | Inspeção do código com apoio da LLM | Refatorado |
| DT-03 | src/modules/tickets/ticket.policy.ts — ticketChange | Lista literal de estados operáveis embutida em validação | Magic Literals; integridade conceitual | Adicionar ou revisar estados exigia alterar uma lista sem nome no fluxo da função, obscurecendo a regra de domínio. | Inspeção do código com apoio da LLM | Refatorado |
| DT-04 | src/modules/tickets/ticket.policy.ts — ticketChange | Uma função grande executa validação, autorização, transições, atualização e mensagens de sete ações | Long Method; baixa coesão; SRP | Mudanças numa ação podem afetar logicamente outras ações; há muitos caminhos para revisar e testar. | Inspeção do código com apoio da LLM | Aberto |
| DT-05 | src/modules/tickets/dto/ticket.dto.ts — TicketActionDto | DTO de ação único tem campos opcionais para sete operações distintas | Baixa coesão do contrato | O schema aceita ações sem campos obrigatórios por ação, de modo que a política de domínio precisa completar a validação. | Inspeção do código com apoio da LLM | Aberto |
| DT-06 | src/modules/tickets/ticket.service.ts — action | Serviço mistura persistência, política de acesso e formatação da autoria da mensagem | SRP; acoplamento | Mudanças na representação de autores podem forçar alteração da camada que executa transação do banco. | Inspeção do código com apoio da LLM | Aberto |
| DT-07 | src/modules/periodic/periodic.service.ts — generate | Método reúne verificação de papel, concorrência, duplicidade e criação de mensagens/chamados | Long Method; SRP; alta complexidade | Mudanças na política de concorrência e nas regras de geração exigem revisão de um único fluxo transacional extenso. | Inspeção do código com apoio da LLM | Aberto |
| DT-08 | src/modules/periodic/periodic.service.ts — create/update/request | Conversão de datas para Date aparece em múltiplos caminhos | Duplicated Code; integridade conceitual | Correções futuras de interpretação de data podem ser aplicadas apenas a uma das operações. | Inspeção do código com apoio da LLM | Aberto |

## Critério de prioridade e escolha

- **DT-01** — priorizado porque as três ações dependem de texto obrigatório, e centralizá-lo evita divergência sem alterar o contrato.
- **DT-02** — priorizado porque concluir chamado precisa persistir exatamente os mesmos campos independentemente de quem encerra.
- **DT-03** — priorizado para nomear uma regra explícita de negócio mantendo as transições permitidas.

## Refatorações aplicadas

- **DT-01:** extração de `requireFeedback` no commit [`5171bcf`](https://github.com/GeraldoMuniz/Projeto-DS/commit/5171bcf).
- **DT-02:** extração de `applyConclusion` no commit [`a0803db`](https://github.com/GeraldoMuniz/Projeto-DS/commit/a0803db).
- **DT-03:** introdução da constante `TEAM_ACTIVE_STATUSES` no commit [`62dc836`](https://github.com/GeraldoMuniz/Projeto-DS/commit/62dc836).

Os resultados da v2 para cada commit estão no [relatório de refatoração](relatorio-refatoracao.md#testes-antes-e-depois).

## Plano proposto para os itens abertos

| ID | Prioridade proposta | Ação de pagamento | Momento proposto |
|---|---|---|---|
| DT-04 | Alta | Extrair as regras por ação de `ticketChange`, mantendo as validações compartilhadas e os resultados cobertos pela v2. | Próximo ciclo de manutenção de chamados. |
| DT-05 | Média | Avaliar schemas por ação e cobrir a compatibilidade dos erros da API antes de mover validações da política para o DTO. | Após DT-04, na próxima revisão do contrato de chamados. |
| DT-06 | Média | Extrair a montagem dos dados de autoria da mensagem e testar a gravação junto à alteração do chamado. | Na próxima mudança de mensagens ou histórico de chamados. |
| DT-07 | Alta | Extrair as verificações de geração em etapas, preservando a transação. Cobrir conflito de versão e duplicidade com testes de integração. | No próximo ciclo de manutenção de periódicas. |
| DT-08 | Baixa | Centralizar a conversão da data nos fluxos de criação, edição e solicitação e testar datas de calendário nos três pontos. | Após DT-07 ou na próxima alteração das regras de data. |

## Princípios observados

**Propriedades de projeto:** coesão, acoplamento e integridade conceitual. **SOLID:** responsabilidade única (SRP). **Code smells:** Duplicated Code, Long Method e Magic Literals. Os descartes e o método de análise estão no [log de qualidade](log-analise.md).
