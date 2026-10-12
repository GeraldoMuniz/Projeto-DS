import { PrismaClient } from '@prisma/client';
try { process.loadEnvFile('.env'); } catch { /* environment provided externally */ }
const db = new PrismaClient();
const requesterId = '00000000-0000-4000-8000-000000000002';
const samples = [
  { id: 4092, title: 'Vazamento teto laboratório', location: 'Lab Graduação 1', type: 'HIDRAULICA', urgency: 'URGENTE', team: 'HIDRAULICA', status: 'ACOMPANHAMENTO', description: 'Está pingando água sobre os computadores da fileira do meio.' },
  { id: 4090, title: 'Servidor de Rede Desligando', location: 'Sala Servidores (CPD)', type: 'TI_REDE', urgency: 'URGENTE', team: 'TI_REDE', status: 'ACOMPANHAMENTO', description: 'Quedas repentinas de energia no rack principal.' },
  { id: 4088, title: 'Ar-condicionado pingando', location: 'Sala Pós-Graduação B', type: 'REFRIGERACAO', urgency: 'MODERADO', team: 'REFRIGERACAO', status: 'ACOMPANHAMENTO', description: 'Unidade interna gerando poças de água no chão.' },
  { id: 4085, title: 'Troca de lâmpada queimada', location: 'Corredor Bloco A', type: 'ELETRICA', urgency: 'LEVE', team: 'ELETRICA', status: 'ACOMPANHAMENTO', description: 'Lâmpada tubular do teto apagada há 3 dias.' },
  { id: 4080, title: 'Compressor Ar-condicionado Queimado', location: 'Auditório Principal', type: 'REFRIGERACAO', urgency: 'URGENTE', team: 'REFRIGERACAO', status: 'RETORNADO', description: 'Aparelho não liga e cheira a queimado.', returnReason: 'Compressor danificado. Equipamento na garantia; requer acionar o fornecedor.' },
];
try {
  await db.$transaction(async tx => {
    for (const sample of samples) await tx.ticket.upsert({ where: { id: sample.id }, update: {}, create: { ...sample, requesterId, requesterName: 'Solicitante de demonstração', messages: { create: { authorId: 'demo', sender: 'Sistema', text: 'Registro de demonstração importado do protótipo HTML.' } } } });
    for (const item of [
      { id: 1, title: 'Limpeza de Filtros AC', location: 'Labs de Graduação (1 ao 4)', date: new Date('2026-10-15'), team: 'REFRIGERACAO' },
      { id: 2, title: 'Revisão Quadro Geral de Baixa Tensão', location: 'Subestação CIn', date: new Date('2026-10-20'), team: 'ELETRICA' },
    ]) await tx.periodicMaintenance.upsert({ where: { id: item.id }, update: {}, create: item });
    await tx.periodicRequest.upsert({ where: { id: 1 }, update: {}, create: { id: 1, title: 'Manutenção preventiva nas bombas d’água', location: 'Cobertura Bloco Central', date: new Date('2026-11-05'), team: 'HIDRAULICA', requesterId: '00000000-0000-4000-8000-000000000011' } });
    for (const table of ['tickets', 'periodic_maintenances', 'periodic_requests']) await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)`);
  });
  console.log('Dados de demonstração disponíveis.');
} finally { await db.$disconnect(); }
