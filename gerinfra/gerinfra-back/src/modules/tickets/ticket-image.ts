import { BadRequestException } from '@nestjs/common';

export const MAX_TICKET_IMAGE_SIZE = 5 * 1024 * 1024;

export interface TicketImageUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

// A extensão e o MIME declarado não bastam: verificar a assinatura binária.
function detectImageMimeType(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
    return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6)))
    return 'image/gif';
  return null;
}

export function validateTicketImage(file?: TicketImageUpload) {
  if (!file) return undefined;
  if (!file.buffer || file.size < 1 || file.size > MAX_TICKET_IMAGE_SIZE || file.buffer.length !== file.size)
    throw new BadRequestException('A imagem deve ter até 5 MB e não pode estar vazia.');
  const mimeType = detectImageMimeType(file.buffer);
  if (!mimeType || mimeType !== file.mimetype)
    throw new BadRequestException('Use uma imagem JPG, PNG, WebP ou GIF válida.');
  return { mimeType, size: file.size, data: file.buffer };
}
