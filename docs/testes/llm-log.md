# Interação com LLM para geração de testes

**Projeto:** Gerinfra — Projeto-DS

**Modelo utilizado no trabalho original:** ChatGPT GPT-6

**Referência:** Implementação de 11/11/2026

## Interação 1: Solicitação de geração dos testes

**Usuário: Geraldo Neto:**

Preciso da tua ajuda pra tentar desenvolver uma suíte automatizada pro backend do meu projeto do Gerinfra usandoTypeScript e Vitest.

O projeto temas essas funcionalidades:

- US01: Controle de acesso por perfis.
- US02: Alocação e realocação de chamados.
- US03: Progressão dos estados de atendimento.
- US04: Conclusão de chamados.
- US05: Retorno e fechamento administrativo.
- US06: Mensagens, prioridades e controle de versão.

Considere o código de `ticket.policy.ts`, `ticket.dto.ts`, a arquitetura documentada e as regras de negócio existentes.

Faz uma primeira versão dos testes, usando partições de equivalência, análise de valores-limite e critérios de aceitação. Comente o código em português.

**LLM:**

Analisei as regras de negócio da política de chamados.

A função `ticketScope` controla quais chamados podem ser acessados pelos perfis ADMIN, TEAM e USER. Já `ticketChange` implementa as ações de alocação, andamento, conclusão, retorno, fechamento, mensagens e prioridade.

Vou criar a primeira suíte em:

`gerinfra/gerinfra-back/tests/v1-llm/ticket.policy.test.ts`

A implementação inicial contém 12 testes, abrangendo os principais caminhos funcionais, incluindo rejeição de feedback ausente e conflito de versão.

Essa primeira versão ainda não cobre integralmente todos os estados alternativos, permissões inválidas e limites do DTO.

## Interação 2: Avaliação da primeira suíte

**Usuário: Geraldo Neto:**

Analise aí a suíte gerada. Da uma olhada se todos os critérios das histórias foram atendidos e identifique quais cenários precisam de testes adicionais.

Não mude a versão inicial. Quero uma segunda versão para comparar os resultados.

**LLM:**

A análise da v1 identificou lacunas, incluindo:

1. Falta de testes para usuários sem identificação e equipes sem especialidade.
2. Ausência de alguns cenários de autorização negada.
3. Falta de cobertura para as duas classificações de conclusão.
4. Necessidade de verificar as fronteiras de comprimento dos textos.
5. Cobertura incompleta dos estados retornado e concluído.

A v2 será criada separadamente, em `tests/v2/ticket.policy.test.ts`, preservando a primeira versão para comparação.

## Interação 3: Melhoria da cobertura

**Usuário: Geraldo Neto:**

Implemente a v2 incluindo as partições inválidas, os limites do DTO, as transições de estado e os cenários de permissão. Mantenha comentários em português.

**LLM:**

A segunda suíte foi ampliada com testes de permissões, transições inválidas e valores-limite.

Entre os cenários acrescentados estão:

- Versões negativas, fracionárias e válidas.
- Mensagens com 0, 1, 5000 e 5001 caracteres.
- Resultados `SUCESSO` e `SEM_SUCESSO`.
- Chamados encerrados que não podem ser modificados.
- Fechamento administrativo permitido somente ao gestor.

A nova suíte amplia a cobertura dos critérios de aceitação e pode ser comparada à v1 sem modificar o arquivo original.

## Resultados reais obtidos posteriormente

Os números abaixo foram registrados nos testes do projeto:

| Indicador | v1 | v2 atualizada |
|---|---:|---:|
| Testes | 12 | 50 |
| Testes aprovados | 12 | 50 |
| Cobertura de linhas | 88,40% | 98,55% |
| Cobertura de branches | 70,12% | 98,70% |

**Observação:** a v2 recebeu melhorias posteriores da equipe, incluindo o CT22. Por isso, os resultados atuais não representam exclusivamente a geração inicial da IA.
