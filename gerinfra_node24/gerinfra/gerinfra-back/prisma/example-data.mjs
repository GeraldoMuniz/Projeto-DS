import { DEMO_REQUESTER_ID } from './demo-data.mjs';

export const EXAMPLE_AUTHOR_ID = 'demo-gerinfra-exemplos-v1';
export const EXAMPLE_REQUESTER_ID = DEMO_REQUESTER_ID;

export function exampleMessage(key) {
  return {
    authorId: `${EXAMPLE_AUTHOR_ID}:${key}`,
    sender: 'Sistema',
    text: 'Chamado fictício criado para demonstração do Gerinfra.',
  };
}

// Datas relativas à primeira importação; uma nova execução não altera os registros existentes.
export const EXAMPLE_TICKETS = [
  {
    key: 'puxador-armario',
    title: 'Puxador solto no armário de materiais',
    location: 'Almoxarifado do Bloco B',
    type: 'MOBILIARIO',
    urgency: 'LEVE',
    status: 'TRIAGEM',
    team: null,
    description: 'O puxador da porta direita está solto e dificulta o acesso aos materiais.',
    createdDaysAgo: 0,
  },
  {
    key: 'torneira-banheiro',
    title: 'Torneira do banheiro não fecha completamente',
    location: 'Banheiro do térreo do Bloco C',
    type: 'HIDRAULICA',
    urgency: 'MODERADO',
    status: 'ACOMPANHAMENTO',
    team: 'HIDRAULICA',
    description: 'A torneira do lavatório continua liberando água mesmo com o registro fechado.',
    createdDaysAgo: 1,
  },
  {
    key: 'rede-laboratorio-inovacao',
    title: 'Ponto de rede sem conexão no laboratório de inovação',
    location: 'Laboratório de Inovação',
    type: 'TI_REDE',
    urgency: 'URGENTE',
    status: 'EM_ANALISE',
    team: 'TI_REDE',
    description:
      'A bancada de demonstrações está sem acesso à rede cabeada. A equipe está verificando o cabeamento e o patch panel.',
    createdDaysAgo: 2,
  },
  {
    key: 'disjuntor-impressao',
    title: 'Disjuntor desarmando na sala de impressão',
    location: 'Sala de Impressão do Bloco A',
    type: 'ELETRICA',
    urgency: 'URGENTE',
    status: 'EM_ANDAMENTO',
    team: 'ELETRICA',
    description:
      'O circuito desarma quando a impressora principal é ligada. A equipe está separando as cargas e revisando as conexões.',
    createdDaysAgo: 3,
  },
  {
    key: 'condensadora-comunicacao',
    title: 'Condensadora com falha de comunicação',
    location: 'Sala de Videoconferência',
    type: 'REFRIGERACAO',
    urgency: 'URGENTE',
    status: 'RETORNADO',
    team: 'REFRIGERACAO',
    description:
      'O sistema de climatização apresenta falha de comunicação entre as unidades e não inicia a refrigeração.',
    returnReason:
      'O diagnóstico indica defeito na placa de comunicação. É necessário apoio da gestão para autorizar a compra da peça e o atendimento do fornecedor.',
    createdDaysAgo: 4,
  },
  {
    key: 'tomada-projetor',
    title: 'Tomada do projetor sem alimentação',
    location: 'Sala de Aula 12',
    type: 'ELETRICA',
    urgency: 'MODERADO',
    status: 'CONCLUIDO',
    team: 'ELETRICA',
    description: 'O projetor não ligava porque a tomada de alimentação estava sem tensão.',
    outcome: 'SUCESSO',
    feedback:
      'Conexão refeita no ponto de alimentação, tomada testada e projetor funcionando normalmente.',
    createdDaysAgo: 8,
    closedDaysAgo: 6,
  },
  {
    key: 'dobradica-reuniao',
    title: 'Dobradiça da porta da sala de reunião desalinhada',
    location: 'Sala de Reunião 2',
    type: 'MOBILIARIO',
    urgency: 'LEVE',
    status: 'CONCLUIDO',
    team: 'MOBILIARIO',
    description:
      'A porta raspava no piso e não fechava corretamente por causa do desalinhamento das dobradiças.',
    outcome: 'SUCESSO',
    feedback:
      'Dobradiças ajustadas, fixações reapertadas e abertura e fechamento verificados com o solicitante.',
    createdDaysAgo: 7,
    closedDaysAgo: 5,
  },
  {
    key: 'bomba-recalque',
    title: 'Bomba de recalque sem pressão',
    location: 'Casa de Bombas do Bloco D',
    type: 'HIDRAULICA',
    urgency: 'URGENTE',
    status: 'CONCLUIDO',
    team: 'HIDRAULICA',
    description: 'A bomba de recalque não atingiu a pressão de trabalho durante a inspeção.',
    outcome: 'SEM_SUCESSO',
    feedback:
      'O conjunto apresentou desgaste interno sem possibilidade de reparo pela equipe local. Atendimento encerrado sem solução; a substituição depende de contratação específica.',
    createdDaysAgo: 12,
    closedDaysAgo: 9,
  },
  {
    key: 'switch-portas',
    title: 'Switch do laboratório com portas inoperantes',
    location: 'Laboratório de Sistemas Embarcados',
    type: 'TI_REDE',
    urgency: 'MODERADO',
    status: 'CONCLUIDO',
    team: 'TI_REDE',
    description:
      'Quatro portas do switch não estabelecem conexão, mesmo após troca dos cabos e testes de configuração.',
    outcome: 'SEM_SUCESSO',
    feedback:
      'Confirmado defeito físico no equipamento fora de garantia. Atendimento encerrado sem reparo porque não há peças compatíveis disponíveis; será necessário substituir o switch.',
    createdDaysAgo: 10,
    closedDaysAgo: 4,
  },
];
