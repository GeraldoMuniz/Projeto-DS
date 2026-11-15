# Sprint 3 — Registro verificável da interação com IA

**Projeto:** Gerinfra — backend NestJS/TypeScript, Vitest 4.  
**Data da geração original:** 12/11/2026.  
**Ferramenta utilizada na geração original:** ChatGPT (OpenAI), **GPT-6**, com acesso aos arquivos por conector GitHub.  
**Participante que solicitou a atividade:** titular da conversa do ChatGPT e do repositório `GeraldoMuniz/Projeto-DS`.

> **Nota de integridade:** este arquivo documenta fatos verificáveis da interação original. Não é uma transcrição completa de uma sessão autônoma do Codex nem um diálogo fictício entre aluno e IA. As mensagens efetivamente escritas pelo usuário aparecem abaixo entre aspas; descrições de procedimentos e prompts reconstruídos são identificados como tais.

## 1. Solicitações reais preservadas na conversa

Trechos **literais** das mensagens enviadas pelo usuário nesta mesma conversa:

> eu preciso fazer isso agora, consegue fazer?

Essa mensagem veio acompanhada de dois documentos com as orientações da Sprint 3: *Suíte de Testes Gerada por LLM e Análise Crítica* e *Qualidade de Código, Dívida Técnica e Refatoração*.

> vai ser necessário dar commit?

> lembre-se de dar commit em meu nome

> faça esse trabalho agora, lembre-se de comentar em portugues

**Essas são as instruções textuais disponíveis.** Não houve uma mensagem adicional do usuário com um prompt independente contendo a lista de testes a gerar. A IA interpretou os dois roteiros, consultou o repositório e produziu a suíte diretamente. Uma redação posterior como "Gere uma suíte..." **não deve ser apresentada como prompt literal enviado à LLM**.

## 2. Contexto realmente examinado

O assistente consultou o repositório `GeraldoMuniz/Projeto-DS` por ferramentas conectadas ao GitHub, incluindo:

- `README.md` e `gerinfra/docs/ARQUITETURA.md`;
- `gerinfra/gerinfra-back/src/modules/tickets/ticket.policy.ts`;
- `gerinfra/gerinfra-back/src/modules/tickets/dto/ticket.dto.ts`;
- `gerinfra/gerinfra-back/src/modules/tickets/ticket.policy.spec.ts`;
- `gerinfra/gerinfra-back/vitest.config.ts` e `package.json`;
- outros serviços do backend consultados para o diagnóstico da segunda parte.

**Histórias:** US01–US06 são agrupamentos didáticos extraídos das regras documentadas. Não foi comprovado que esses eram os identificadores oficiais da Sprint 2.

**Limite metodológico importante:** a matriz foi criada pelo **mesmo assistente e no mesmo contexto de conversa** que produziu a v1. Embora a matriz tenha sido commitada antes, não é possível sustentar que a IA não a conhecia quando gerou os testes. Logo, a exigência de um projeto manual independente, elaborado pela equipe antes da IA, **não está demonstrada** por esse histórico.

## 3. Sequência verificável de geração

| Etapa | Data/hora local (Recife) | Evidência Git | O que ocorreu |
|---|---|---|---|
| Preparação da matriz | 12/11, 10h44 | [commit `434dd48`](https://github.com/GeraldoMuniz/Projeto-DS/commit/434dd48b80639038890c353a3b7b12f2edd99b73) | Matriz gerada com apoio da IA, antes do arquivo v1 |
| Geração da v1 | 12/11, 10h45 | [commit `7193918`](https://github.com/GeraldoMuniz/Projeto-DS/commit/71939187adb0d64f17a4cb1e134a32acaa427a0d) | Criação de `tests/v1-llm/ticket.policy.test.ts`, com 12 testes; não houve edição posterior dessa v1 |
| Melhoria da v2 | 12/11, 10h46 | [commit `388f757`](https://github.com/GeraldoMuniz/Projeto-DS/commit/388f75796b8bd37769aecc07206c640591d5e06b) | Criação de `tests/v2/ticket.policy.test.ts`, separadamente da v1 |
| Correção da v2 | 12/11, posteriormente | [commit `42f2a7c`](https://github.com/GeraldoMuniz/Projeto-DS/commit/42f2a7c579bc50b5c826cc80038db169d5e8ce7b) | Ajuste de tipagem do helper de usuário na v2 |
| Registro inicial do log | 12/11, 10h51 | [commit `fba34eb`](https://github.com/GeraldoMuniz/Projeto-DS/commit/fba34eb1a146173b1a6826504cfefd2c9fa5c854) | Documentação redigida depois das suítes, com prompts operacionais reconstruídos |

**Importante:** a mensagem de commit "matriz manual" é um título histórico de commit, não prova de que a matriz tenha sido construída exclusivamente por humanos.

### Saída da IA na etapa v1

- **Arquivo real:** [`gerinfra/gerinfra-back/tests/v1-llm/ticket.policy.test.ts`](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/gerinfra/gerinfra-back/tests/v1-llm/ticket.policy.test.ts).
- **Conteúdo:** 12 testes de `ticketScope` e `ticketChange`, sobre perfis, alocação, andamento, conclusão, retorno, fechamento, mensagem, prioridade e versão.
- **Criação:** uma produção direta do ChatGPT na conversa, com gravação do arquivo pelo conector GitHub; não há registro de uma segunda ferramenta LLM recebendo um prompt independente.
- **Edição manual da v1:** não registrada; o arquivo gerado foi mantido.

### Saída da IA na etapa v2

- **Arquivo real:** [`gerinfra/gerinfra-back/tests/v2/ticket.policy.test.ts`](https://github.com/GeraldoMuniz/Projeto-DS/blob/sprint3-testes-qualidade-2026/gerinfra/gerinfra-back/tests/v2/ticket.policy.test.ts).
- **Melhoria:** foram incorporados novos casos de partição, ações inválidas, versões, resultados de conclusão e validações do DTO, além de ajustes posteriores feitos pela equipe.
- **Não substituiu a v1.** Os indicadores oficiais devem continuar usando as duas suítes identificadas nos seus respectivos caminhos.

## 4. O que não pode ser afirmado como histórico literal

O log anterior continha instruções do tipo "Para o Gerinfra, gere uma suíte..." e "Revise a cobertura..." escritas posteriormente para **descrever** o trabalho. Esses textos podem servir como **prompts de reprodução propostos**, mas **não foram mensagens literais independentes enviadas pelo usuário em 12/11**.

Também existia uma seção intitulada "Pedido registrado" com uma solicitação mais detalhada do que aquela efetivamente enviada pelo usuário. Esse trecho foi retirado nesta revisão para não ser confundido com uma transcrição.

**Não há evidência de que a geração original tenha sido feita pelo Codex.** O histórico disponível desta interação mostra ChatGPT GPT-6 e operações via conector GitHub. Não se declara a existência de uma sessão Codex em `~/.codex/sessions`, nem se inventa uma.

**O registro de prompts completos neste caso consiste nas mensagens literais acima e nos dois roteiros fornecidos pelo usuário.** A parte da exigência que pressupõe uma conversa autônoma com prompt e resposta separados não pode ser reconstruída fielmente depois do fato. O código gerado e os commits constituem a evidência material da resposta da IA.

## 5. Execução, métricas e crítica da v1

A v1 oficial contém **12 testes**. Os resultados medidos para ela foram **12 passando, 0 falhando, 0 sem compilar, 88,40% de linhas e 70,12% de branches** no escopo de `ticket.policy.ts`. A [execução inicial arquivada no GitHub Actions](https://github.com/GeraldoMuniz/Projeto-DS/actions/runs/43233016036) é a evidência automatizada. Os números e as revisões posteriores da v2 estão no [relatório de análise crítica](relatorio-analise-critica.md).

**Análise crítica da geração:** a v1 deixou lacunas em partições inválidas, fronteiras e ramos alternativos. A revisão de v2 buscou essas lacunas. O fato de a IA também ter auxiliado a criar a matriz inicial limita a independência da comparação "equipe versus LLM" e deve ser declarado na entrega.

## 6. Replicação posterior relatada pela equipe (15/11)

Em conversa de equipe apresentada posteriormente, **David informou** ter realizado uma replicação com o Gemini, gerando 45 testes e alegando 100% de cobertura. Também descreveu três problemas possíveis na suíte dessa replicação: uso do status inexistente `ABERTO`, um `makeTicket` com campos incompatíveis com o modelo e mensagens de erro copiadas do código como oráculo.

**Status da evidência:** trata-se do relato enviado pela equipe, **não de um resultado que esta revisão tenha reproduzido ou validado**. Não foi apresentado aqui um arquivo de teste da replicação nem uma identificação preenchida do modelo do Gemini. O registro **não altera a v1 oficial nem os indicadores v1/v2**. Caso esse experimento seja anexado, deve manter sua própria data, modelo real, arquivo, prompt literal e saída de ferramenta, sem se fazer passar pela geração de 12/11.

## 7. Pontos pendentes de validação pela equipe

- [ ] Revisar as mensagens originais na conversa do titular, caso o histórico seja exportado para apresentação.
- [ ] Confirmar os critérios de aceitação com o backlog original da Sprint 2, se disponível.
- [ ] Reconhecer explicitamente no relatório que a matriz foi auxiliada pela mesma IA que gerou a v1.
- [ ] Anexar, se desejado, a replicação de 15/11 com **prompt e resposta efetivos**, código-fonte produzido, modelo identificado e execução verificável.

**Confiabilidade do registro:** mensagens literais e commits identificados podem ser conferidos; descrições da sequência são uma reconstrução documental baseada nesses registros. Não há conversa simulada apresentada como real.
