# Gráficos e indicadores do gestor

A aba original do gestor mantém seus filtros, seis indicadores, detalhes de apoio e lista completa de chamados. A apresentação foi adaptada aos gráficos com eixos do arquivo de referência `Gerinfra-para-teste-local.zip`, usando os dados e as regras do projeto original.

## Usar a aba

1. Entre como gestor e abra **Gráficos e indicadores**.
2. Selecione as datas de **abertura**, equipe responsável atual e resultado desejado. Os filtros são aplicados imediatamente.
3. Em **Agrupar por**, escolha dia, semana ou mês para as duas séries temporais. As semanas seguintes ao primeiro intervalo começam na segunda-feira; os meses, no dia 1.
4. Abra **Ver dados de…** para consultar os valores exatos de cada gráfico. Os pontos e as colunas também mostram valores ao passar o mouse.
5. Use **Imprimir / Salvar PDF** para apresentar o relatório com os gráficos e o recorte aplicado. A impressão oculta a navegação e os controles editáveis.

**Limpar filtros** restaura o recorte completo e o agrupamento diário. A aba continua exclusiva do perfil gestor.

## Gráficos

| Gráfico | Eixo X | Eixo Y |
| --- | --- | --- |
| Aberturas e conclusões do recorte | Data do intervalo | Chamados abertos ou concluídos, separados por resultado |
| Pendências do recorte ao longo do tempo | Data do intervalo | Chamados ainda abertos ao final de cada intervalo |
| Situação dos chamados | Estado atual | Quantidade de chamados |
| Resultados das conclusões | Bem-sucedido, sem sucesso ou não informado | Quantidade de conclusões |
| Demanda por equipe | Equipe responsável atual ou sem alocação | Total, em aberto e aguardando apoio |

## Interpretar os números

- Todos os gráficos usam os chamados selecionados pelos filtros de abertura, equipe e resultado. As linhas não incluem chamados de fora desse recorte.
- Os cartões e as colunas mostram a **situação atual**. As linhas mostram eventos pelas datas de abertura e encerramento. Ao consultar um período passado, um chamado concluído depois pode aparecer no cartão de concluídos e ainda estar pendente no saldo histórico.
- O período das linhas vai da data inicial informada ou primeira abertura válida até a data final informada ou hoje, limitado ao dia atual. Dias sem eventos têm zero. O dia atual é parcial.
- Chamados retornados continuam abertos e aparecem como necessidade de apoio. Eles não são conclusões sem sucesso.
- A taxa de sucesso é `bem-sucedidos / (bem-sucedidos + sem sucesso)`. Conclusões sem resultado informado ficam fora desse cálculo.
- Chamados concluídos sem data confiável de encerramento ficam fora das duas séries temporais. Eles permanecem nos cartões, colunas e lista, com aviso da quantidade excluída das linhas. Datas ausentes não são estimadas.
- Há um limite de 366 intervalos por série. Se ele for atingido, selecione semana/mês ou um período menor; os demais indicadores continuam disponíveis.

As datas usam **America/Recife**. A adaptação não importa o modelo de conclusão ou as migrations do ZIP: o projeto continua distinguindo explicitamente `SUCESSO` e `SEM_SUCESSO`, independentemente de quem encerrou o chamado.

## Atualizar e demonstrar

Esta adaptação altera apenas o frontend e não adiciona dependências ou migrations. Atualize a branch `mvp_funcional` e reinicie o Vite, ou compile o frontend com `npm run build` para publicação pelo procedimento habitual.

Para carregar os nove chamados de demonstração já disponíveis no projeto, execute `npm run seed:novos` em `gerinfra-back`, com o banco rodando. A importação é opcional e não duplica os mesmos exemplos. Os dados já existentes também são usados pelos gráficos.
