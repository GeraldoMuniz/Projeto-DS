import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { MAX_TICKET_IMAGE_SIZE, validateTicketImage } from './ticket-image';

describe('Imagem opcional dos chamados', () => {
  const formatos = [
    ['JPG', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ['PNG', 'image/png', Buffer.from('89504e470d0a1a0a', 'hex')],
    ['WebP', 'image/webp', Buffer.from('RIFF1234WEBP', 'ascii')],
    ['GIF', 'image/gif', Buffer.from('GIF89a', 'ascii')],
  ] as const;
  it.each(formatos)('aceita %s', (_nome, mimetype, buffer) => {
    expect(validateTicketImage({ mimetype, buffer, size: buffer.length })).toEqual({
      mimeType: mimetype, data: buffer, size: buffer.length,
    });
  });
  it('permite chamado sem imagem', () => {
    expect(validateTicketImage()).toBeUndefined();
  });
  it('recusa SVG', () => {
    const buffer = Buffer.from('<svg/>');
    expect(() => validateTicketImage({ mimetype: 'image/svg+xml', buffer, size: buffer.length }))
      .toThrow(BadRequestException);
  });
  it('recusa MIME não correspondente ao conteúdo', () => {
    const buffer = Buffer.from('GIF89a');
    expect(() => validateTicketImage({ mimetype: 'image/png', buffer, size: buffer.length }))
      .toThrow(BadRequestException);
  });
  it('recusa arquivos maiores que 5 MB', () => {
    const buffer = Buffer.alloc(MAX_TICKET_IMAGE_SIZE + 1);
    expect(() => validateTicketImage({ mimetype: 'image/png', buffer, size: buffer.length }))
      .toThrow(BadRequestException);
  });
  it('recusa arquivos vazios', () => {
    const buffer = Buffer.alloc(0);
    expect(() => validateTicketImage({ mimetype: 'image/png', buffer, size: 0 }))
      .toThrow(BadRequestException);
  });
});
