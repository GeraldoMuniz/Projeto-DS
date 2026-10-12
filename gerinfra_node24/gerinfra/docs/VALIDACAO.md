# Validação realizada

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
