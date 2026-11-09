# Validação realizada

## Indicadores do gestor — 9 de novembro de 2026

Alteração implementada a partir da branch `mvp_funcional` (`d13597f`).

| Verificação | Resultado |
| --- | --- |
| Backend: Prisma generate, Biome CI e build | Passaram |
| Backend: testes unitários | 29 passaram |
| Frontend: ESLint e build TypeScript/Vite | Passaram |
| Frontend: testes unitários e componentes | 63 passaram |
| PostgreSQL 14.2: migrations da instalação limpa | 3 aplicadas |
| Integração HTTP com JWT/JWKS, RBAC e persistência | 10 testes passaram (9 cenários + principal) |
| Chromium: gráficos em React com fixtures | 10 verificações passaram |
| Layout em 390 px | Sem transbordamento da página |
| Impressão | PDF A4 gerado, sem filtros editáveis ou navegação |

As verificações novas cobrem separação entre retorno aberto e conclusão sem sucesso, resultados históricos não informados, denominador da taxa de sucesso, período inclusivo no horário de Recife, combinação/limpeza de filtros, período invertido, base vazia, callbacks e aba exclusiva do gestor. Os testes de componentes verificam também estados de carregamento/erro sem indicadores falsos e os payloads de conclusão de equipe/gestor com resultado, feedback e versão.

A integração usou a API real com tokens assinados pelo fixture JWKS e PostgreSQL 14.2 em container temporário isolado, removido ao terminar. Foram persistidos e consultados `SUCESSO`, `SEM_SUCESSO`, feedback e `closedAt`. A migration mantém registros históricos sem resultado ou data de conclusão inferidos.

A verificação visual nova usou o componente React real, CSS da aplicação e dados fictícios em um harness isolado, sem autenticação ou backend. O Keycloak real e a implantação institucional não foram exercitados. O build passou com os avisos já existentes de tamanho do bundle e comentários de dependências. A publicação no GitHub depende de conexão autenticada e não faz parte desta validação local.

## Validação anterior do MVP

Ambiente: Node.js 24.19.0, npm 11.9.0.

| Verificação | Resultado |
| --- | --- |
| Backend: build NestJS/TypeScript | Passou |
| Backend: Biome CI | Passou |
| Backend: testes unitários | 23 passaram |
| Prisma: schema e geração do client | Passou |
| Migrations SQL | Aplicadas no PostgreSQL de teste |
| Frontend: build TypeScript/Vite | Passou |
| Frontend: ESLint | Passou |
| Frontend: testes unitários e componentes | 40 passaram |
| Integração HTTP com guards reais e tokens assinados | 8 cenários passaram, além do teste principal |
| Fluxos no Chromium automatizado | Passaram |
| Layout móvel com largura de 390 px | Sem transbordamento horizontal |
| Compose | YAML e referências revisados; containers não executados |

## Cenários HTTP

1. Rejeitar ausência de token, papel desconhecido e assinatura adulterada.
2. Validar entrada, criar chamado e impedir leitura por outro solicitante.
3. Alocar equipe e bloquear outra especialidade.
4. Ocultar mensagens internas da equipe do solicitante.
5. Persistir análise/andamento e rejeitar versão desatualizada.
6. Retornar, reencaminhar e concluir com feedback obrigatório.
7. Aprovar solicitação uma única vez e restringir consulta de periódicas à equipe.
8. Gerar ocorrência uma vez e preservar o chamado após excluir a periódica.

O teste usa a API compilada, Prisma e migrations reais. Os tokens são emitidos por um fixture JWKS com chaves RSA; a autenticação de produção não é desabilitada. A persistência de teste usou PGlite, que executa PostgreSQL em WebAssembly e expõe o protocolo PostgreSQL ao Prisma, porque este ambiente não dispõe de Docker. Isso valida o caminho API → Prisma → SQL, mas não substitui a verificação no PostgreSQL e Keycloak do cliente.

## Cenários de interface

No Chromium, com frontend Vite e API reais, foram exercitados: tela de entrada, sessão OIDC de teste, abertura de chamado, linha do tempo, painel do gestor, alocação, cadastro de periódica, fila de equipe, arrastar um chamado entre prioridades, análise e conclusão com feedback. A revisão visual cobriu desktop e celular. Não houve erro JavaScript não tratado nesses fluxos.

A sessão OIDC foi fornecida por um servidor de teste com discovery, refresh e tokens assinados. O formulário real de login do Keycloak/LDAP institucional não foi exercitado. O realm local está configurado para a apresentação, e sua importação deve ser conferida na primeira execução do Docker.

## Pontos para o ambiente do cliente

- Executar o Compose e confirmar a importação do realm `Local`.
- Testar entrada/saída e refresh no Keycloak real, incluindo os papéis e a audiência da API.
- Configurar o LDAP e os clients institucionais com a equipe de TI.
- Executar os testes de integração contra PostgreSQL convencional já migrado.
- Decidir, caso necessário, o intervalo de recorrência e um agendador automático. Este protótipo usa a geração manual do HTML.
- Configurar endereços, TLS e credenciais de implantação.

O Vite emitiu um aviso sobre tamanho do bundle e comentários de dependências, sem impedir o build. O projeto não foi publicado ou ligado ao ambiente institucional.
