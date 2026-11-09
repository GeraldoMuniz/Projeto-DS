# Gerinfra CIn-UFPE

Protótipo funcional de gestão de manutenção predial, migrado de `gerinfra_prototype.html` para os boilerplates oficiais do CInCoders. Frontend React 18 + Vite + Cinnamon; API NestJS 11 + Prisma + PostgreSQL; autenticação Keycloak OIDC/JWT/JWKS. **Node 24 nos dois projetos.**

## Executar no Windows ou Linux

Instale Node.js 24 e Docker Desktop com Docker Compose. No Windows, use Git Bash para os comandos abaixo. Extraia o ZIP e abra um terminal na pasta `gerinfra`.

### 1. Subir PostgreSQL e Keycloak

```bash
docker compose up -d
```

Espere o Keycloak iniciar. Acesse `http://localhost:8080/auth` para confirmar. O realm `Local`, os clients e as contas de demonstração são importados automaticamente no primeiro boot. São contas locais para apresentação; LDAP institucional depende do ambiente do cliente.

### 2. Preparar e iniciar a API

```bash
cd gerinfra-back
cp .env.example .env
npm ci
npm run prisma:generate
npm run migration:run
node prisma/seed.mjs
npm run dev
```

O sistema inicia sem chamados de exemplo. O seed de tabelas de apoio (`node prisma/seed.mjs`) não cria chamados ou manutenções. Se quiser os exemplos antigos do HTML, `npm run seed:demo` é opcional: importa cinco chamados, duas periódicas e uma solicitação, sem redefinir registros já existentes com os mesmos IDs. Não use esse seed em um banco institucional com dados reais.

### Remover os exemplos antigos e cadastrar novos depois

Para remover **todos os chamados, inclusive os cadastrados manualmente**, e suas mensagens, execute dentro de `gerinfra-back`:

```bash
npm run chamados:limpar
```

Esse comando também remove os exemplos antigos de periódicas e solicitações quando ainda podem ser identificados e não têm vínculos preservados. As contas de acesso, tabelas de apoio e sequências de IDs são mantidas. Manutenções periódicas e solicitações criadas manualmente não são apagadas. Para visualizar as quantidades antes de remover dados, use `npm run chamados:conferir`.

Depois, recarregue a página: a lista de chamados e os gráficos ficarão vazios. Quando quiser, cadastre os novos chamados pela interface. Não execute `seed:demo` nesse fluxo, pois ele importa novamente os exemplos antigos.

Se quiser remover **somente os exemplos antigos**, preservando chamados manuais, use:

```bash
npm run demo:limpar
```

O comando usa a conexão `DATABASE_URL` do `.env` do backend e informa as quantidades removidas. Ele identifica os chamados pelos IDs do seed, solicitante e mensagem original de importação. As mensagens desses chamados também são removidas. Manutenções e solicitações só são excluídas quando correspondem ao conteúdo original e não têm vínculos com dados preservados; registros alterados são mantidos e informados no resultado. Cadastros manuais, usuários e tabelas de apoio permanecem. Não há reset do banco ou das sequências de IDs.

Para conferir o que seria removido sem alterar dados, use `npm run demo:conferir`. Depois da limpeza, recarregue a página. Se só existiam os exemplos, as listas e os gráficos ficarão vazios. Os registros preservados, caso existam, continuam aparecendo.

Quando quiser novos exemplos, cadastre os chamados pelo perfil de solicitante e faça a alocação, atendimento, retorno e conclusão pelos perfis correspondentes. Assim os indicadores usarão os novos cadastros.

### 3. Iniciar o frontend em outro terminal

Partindo da pasta `gerinfra`:

```bash
cd gerinfra-front
cp .env.example .env
npm ci
npm run dev
```

Abra **http://localhost:5173/gerinfra/**. Clique em **Entrar** para usar a tela do Keycloak.

| Perfil | Usuário | Senha local |
| --- | --- | --- |
| Gestor Gerinfra | `admin` | `admin` |
| Solicitante | `user` | `user` |
| Equipe Elétrica | `eletrica` | `equipe` |
| Equipe Hidráulica | `hidraulica` | `equipe` |
| Equipe Refrigeração | `refrigeracao` | `equipe` |
| Equipe TI / Rede | `ti-rede` | `equipe` |
| Equipe Mobiliário | `mobiliario` | `equipe` |

Use o menu da conta no cabeçalho para sair. Para demonstrar pessoas simultaneamente, abra janelas de navegador com sessões separadas (por exemplo, uma janela normal e outra anônima).

| Serviço | URL local |
| --- | --- |
| Interface | http://localhost:5173/gerinfra/ |
| API | http://localhost:3000/gerinfra/api/v1 |
| Swagger | http://localhost:3000/api/docs |
| Health | http://localhost:3000/gerinfra/api/health |
| Keycloak | http://localhost:8080/auth |

### Alternativa: tudo em containers

```bash
docker compose --profile full up -d --build
```

O serviço `migrate` aplica as migrations e os lookups antes de iniciar a API; o frontend é servido pelo Nginx na mesma porta 5173. Para carregar os exemplos do HTML:

```bash
docker compose --profile full run --rm migrate node prisma/seed-demo.mjs
```

Não execute os servidores Node locais nas mesmas portas enquanto os containers `backend` e `frontend` estiverem ativos. O Compose completo foi preparado e revisado, mas não foi executado neste ambiente, que não dispõe de Docker.

## O que está implementado

- Solicitante: novo chamado com local, especialidade, urgência e descrição; lista própria; status, mensagens e feedback na linha do tempo.
- Gestor: métricas e colunas de triagem/acompanhamento/histórico; alocação e reencaminhamento; retornos; mensagens ao solicitante e à equipe; fechamento administrativo após retorno.
- Gestor: aba **Gráficos e indicadores**, com filtros por data de abertura, equipe e resultado, distribuição por situação/equipe, taxa de sucesso, retornos que precisam de apoio e relatório para impressão ou PDF.
- Conclusões: equipe e gestor registram **bem-sucedido** ou **sem sucesso**, com feedback e data de encerramento. Conclusões antigas sem classificação aparecem como resultado não informado.
- Equipe: fila por urgência com arrastar e soltar; alteração de prioridade por campo no detalhe; análise, andamento, conclusão com feedback e retorno justificado à gestão; mensagens ao solicitante; consulta de concluídos.
- Periódicas: cadastro, edição, exclusão lógica, alocação de equipe e geração manual de chamado, como no botão de simulação do HTML.
- Solicitações de periódicas: envio pela equipe, consulta por especialidade, aprovação com inclusão no cronograma e rejeição pelo gestor.
- Dados persistidos no PostgreSQL, IDs gerados pelo banco, histórico com datas reais, validação Zod, proteção contra edição com versão antiga e contra geração duplicada para a mesma periódica/data.

O HTML não define intervalo de recorrência (semanal/mensal etc.). Por isso, este protótipo mantém a data programada e a geração manual. **Não há agendador automático em segundo plano.** Para gerar uma nova ocorrência, altere a data da periódica antes de gerar outro chamado.

## Testar e compilar

Backend:

```bash
cd gerinfra-back
npm run lint:ci
npm test
npm run build
npm run test:e2e
```

`test:e2e` precisa do PostgreSQL já migrado e usa um servidor JWKS de teste para emitir tokens assinados; a API valida os tokens com os guards reais. O teste usa registros próprios e remove seus dados ao terminar. Não requer que o Keycloak esteja disponível. Ele inicia a API na porta 3101 (`E2E_PORT` permite mudar a porta).

`npm run test:demo` verifica a limpeza em um PostgreSQL de teste dedicado e já migrado. Defina `DEMO_TEST_DATABASE_URL` com a conexão desse banco vazio. A suíte não usa a conexão normal do `.env`: ela importa o seed e verifica a limpeza seletiva, a limpeza de todos os chamados, as prévias, vínculos e sequências. Não execute essa suíte no banco da aplicação em uso.

Frontend:

```bash
cd gerinfra-front
npm run lint
npm test
npm run build
npm run preview
```

Para usar a interface compilada, o servidor da API e o Keycloak devem continuar rodando. Os clients locais também aceitam `http://localhost:4173` para o preview.

## Organização e continuidade

### Atualizar uma instalação existente

A aba de indicadores usa os chamados persistidos e respeita o acesso exclusivo do gestor. Antes de iniciar a API atualizada, aplique a migration dos novos campos nullable de conclusão:

```bash
cd gerinfra-back
npm ci
npm run prisma:generate
npm run migration:run
npm run build
```

Atualize também o frontend com `npm ci` e `npm run build`. Integrações que enviam as ações `COMPLETE` ou `CLOSE` devem incluir `outcome` (`SUCESSO` ou `SEM_SUCESSO`) e `text` (feedback obrigatório).

No perfil do gestor, abra **Gráficos e indicadores** e selecione o recorte desejado. **Imprimir / Salvar PDF** abre a impressão do navegador com os gráficos, filtros aplicados e tabela de chamados, sem a navegação do sistema. As datas do filtro usam o dia de abertura em Recife; os números mostram a situação atual desses chamados. Não representam as transições ocorridas no período. A taxa de sucesso considera apenas conclusões com resultado informado; retornos continuam abertos e indicam necessidade de intervenção da gestão.

### Estrutura

- `gerinfra-back/src/modules/tickets`: controllers, DTOs, regras de autorização/transição e serviço de chamados.
- `gerinfra-back/src/modules/periodic`: periódicas e solicitações, com aprovação transacional.
- `gerinfra-back/prisma`: schema, migrations e seeds.
- `gerinfra-back/setup/realm.json`: configuração local dos clients, papéis e usuários.
- `gerinfra-front/src/modules/maintenance`: tipos, services e hooks por entidade; formulários, quadros e detalhes em componentes React.
- `gerinfra-front/src/routes.tsx`: rotas protegidas e ciclo de vida dos tokens do boilerplate.
- `gerinfra-front/src/services/api.ts`: cliente HTTP oficial, refresh e extração de erros.
- `docs/ARQUITETURA.md`: regras e contratos de domínio.
- `docs/VALIDACAO.md`: verificações realizadas e limites do ambiente de teste.

Os exemplos `task`, `todos` e `team` originais foram conservados como referência de desenvolvimento, mas não estão registrados nas rotas/API do Gerinfra. O ZIP não inclui `node_modules`, builds, arquivos `.git`, o gerador de novos projetos nem o site de documentação do boilerplate.

## Configuração institucional

A equipe de TI deverá configurar a URL e o realm reais do Keycloak, os clients, os papéis e o PostgreSQL nos `.env`. O client do frontend precisa ser público, com fluxo Authorization Code/PKCE, redirects e web origins autorizados; o token deve incluir a audiência `gerinfra-back`.

As equipes vêm de papéis assinados no token, não de um campo enviado pelo navegador. O gestor tem precedência sobre equipe e solicitante; a equipe tem precedência sobre solicitante. Os nomes dos papéis estão em `docs/ARQUITETURA.md`.

Em containers, `KEYCLOAK_AUTH_SERVER_URL` continua sendo a URL pública usada como issuer. `KEYCLOAK_JWKS_URL` permite buscar as chaves por um endereço interno, mantendo a validação do issuer público.

O frontend Docker usa configuração em build (`VITE_API_URL`, `VITE_KEYCLOAK_JSON`, `VITE_BASE_URL`). A configuração Nginx fornecida usa o caminho `/gerinfra`; se mudar esse caminho, ajuste também `nginx.conf`, redirects e origins. As credenciais de demonstração e o modo `start-dev` do Keycloak são exclusivos do desenvolvimento.

## Bases utilizadas

- Backend oficial: commit `525dc89a3dea6013bdf46a610132417d03ecdded`.
- Frontend oficial: commit `e47822f5ade7f7ff55ae1ba0bb73f02afbe4d841`.
- https://cincoders-nestjs-starterkit.vercel.app/
- https://cincoders-reactjs-starterkit.vercel.app/
