# Relatório de dívida técnica — Gerinfra / Sprint 3

**Data:** 12/11/2026. **Escopo analisado:** `ticket.policy.ts`, `ticket.dto.ts`, `ticket.service.ts` e `periodic.service.ts`, todos do backend.

Os problemas abaixo foram identificados por inspeção assistida por ChatGPT GPT-6. Cada localização e consequência se refere a código observado no repositório. **A revisão/validação humana pela equipe ainda deve ser registrada**, conforme a instrução da atividade; a simples sugestão da IA não substitui essa confirmação.

| ID | Arquivo / função | Problema | Categoria | Consequência | Origem | Status |
|---|---|---|---|---|---|---|
| DT-01 | src/modules/tickets/ticket.policy.ts — ticketChange | Validação de texto obrigatório duplicada em COMPLETE/RETURN/CLOSE | Duplicated Code; SRP; coesão | Alterações no modo de validar feedback teriam de ser replicadas em caminhos diferentes, aumentando risco de mensagens ou regras inconsistentes. | Inspeção do código com apoio da LLM | Refatorado |
| DT-02 | src/modules/tickets/ticket.policy.ts — ticketChange | Atribuições de conclusão repetidas em COMPLETE/CLOSE | Duplicated Code; integridade conceitual | Data de encerramento, status, resultado e feedback podem divergir entre encerramento por equipe e por gestor. | Inspeção do código com apoio da LLM | Refatorado |
| DT-03 | src/modules/tickets/ticket.policy.ts — ticketChange | Lista literal de estados operáveis embutida em validação | Magic Literals; integridade conceitual | Adicionar ou revisar estados exigia alterar uma lista sem nome no fluxo da função, obscurecendo a regra de domínio. | Inspeção do código com apoio da LLM | Refatorado |
| DT-04 | src/modules/tickets/ticket.policy.ts — ticketChange | Uma função grande executa validação, autorização, transições, atualização e mensagens de sete ações | Long Method; baixa coesão; SRP | Mudanças numa ação podem afetar logicamente outras ações; há muitos caminhos para revisar e testar. | Inspeção do código com apoio da LLM | Aberto |
| DT-05 | src/modules/tickets/dto/ticket.dto.ts — TicketActionDto | DTO de ação único tem campos opcionais para sete operações distintas | Baixa coesão; risco de contratos inválidos; ISP (analogia de contrato) | O schema aceita estruturalmente ações sem campos obrigatórios por ação; essas validações são adiadas para a função de domínio. | Inspeção do código com apoio da LLM | Aberto |
| DT-06 | src/modules/tickets/ticket.service.ts — action | Serviço mistura persistência, política de acesso e formatação da autoria da mensagem | SRP; acoplamento | Mudanças na representação de autores podem forçar alteração da camada que executa transação do banco. | Inspeção do código com apoio da LLM | Aberto |
| DT-07 | src/modules/periodic/periodic.service.ts — generate | Método reúne verificação de papel, concorrência, duplicidade e criação de mensagens/chamados | Long Method; SRP; alta complexidade | Mudanças na política de concorrência e nas regras de geração exigem revisão de um único fluxo transacional extenso. | Inspeção do código com apoio da LLM | Aberto |
| DT-08 | src/modules/periodic/periodic.service.ts — create/update/request | Conversão de datas para Date aparece em múltiplos caminhos | Duplicated Code; integridade conceitual | Correções futuras de interpretação de data podem ser aplicadas apenas a uma das operações. | Inspeção do código com apoio da LLM | Aberto |

## Critério de prioridade e escolha

- **DT-01** — priorizado porque as três ações dependem de texto obrigatório, e centralizá-lo evita divergência sem alterar o contrato.
- **DT-02** — priorizado porque concluir chamado precisa persistir exatamente os mesmos campos independentemente de quem encerra.
- **DT-03** — priorizado para nomear uma regra explícita de negócio mantendo as transições permitidas.

## Refatorações aplicadas

- **DT-01:** Extract Function: requireFeedback. Commit isolado com DT-01 na mensagem; comparar os testes da v2 antes e depois da alteração.
- **DT-02:** Extract Function: applyConclusion. Commit isolado com DT-02 na mensagem; comparar os testes da v2 antes e depois da alteração.
- **DT-03:** Replace Magic Literal: TEAM_ACTIVE_STATUSES. Commit isolado com DT-03 na mensagem; comparar os testes da v2 antes e depois da alteração.

## Itens abertos e riscos

DT-04 a DT-08 permanecem em aberto por terem impacto maior na arquitetura ou requererem novos testes de integração. Um diagnóstico de design pode ser contestável: por exemplo, DT-05 está relacionado à coesão do contrato, mas não é uma violação literal de ISP sem uma interface consumida por diferentes clientes.

## Conferência pela equipe

- [ ] Revisar cada localização e consequência e marcar os itens aceitos.
- [ ] Revisar se DT-03 representa problema relevante ou apenas melhoria de legibilidade.
- [ ] Confirmar que a suíte v2 passa antes e depois dos três commits.
- [ ] Anexar/relacionar as execuções de cobertura da CI.

## Princípios observados

**Propriedades de projeto:** coesão, acoplamento e integridade conceitual. **SOLID:** principalmente responsabilidade única (SRP). **Code smells:** Duplicated Code, Long Method e Magic Literals. Não foi identificada evidência suficiente para apontar LSP como violado no escopo inspecionado.
