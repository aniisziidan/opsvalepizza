/**
 * File validation utilities for quote uploads.
 * Enforces magic-byte signature validation, allowed extensions, MIME whitelist, and 25MB max size.
 */

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.ai', '.eps'] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/postscript',
  'application/illustrator',
  'application/vnd.adobe.illustrator',
  'application/octet-stream', // frequently sent for .ai/.eps by browsers
] as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: 'pdf' | 'png' | 'jpeg' | 'postscript' | 'unknown';
}

/**
 * Checks magic-byte signature of buffer.
 */
export function verifyMagicBytes(buffer: Buffer): { valid: boolean; detectedType: 'pdf' | 'png' | 'jpeg' | 'postscript' | 'unknown' } {
  if (!buffer || buffer.length < 4) {
    return { valid: false, detectedType: 'unknown' };
  }

  // PDF signature: %PDF (0x25, 0x50, 0x44, 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { valid: true, detectedType: 'pdf' };
  }

  // PNG signature: 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedType: 'png' };
  }

  // JPEG signature: 0xFF, 0xD8, 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedType: 'jpeg' };
  }

  // PostScript (EPS/AI) signature: %! (0x25, 0x21) or EPS binary header (0xC5, 0xD0, 0xD3, 0xC6)
  if (
    (buffer[0] === 0x25 && buffer[1] === 0x21) ||
    (buffer[0] === 0xc5 && buffer[1] === 0xd0 && buffer[2] === 0xd3 && buffer[3] === 0xc6)
  ) {
    return { valid: true, detectedType: 'postscript' };
  }

  return { valid: false, detectedType: 'unknown' };
}

export function validateUploadedFile(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): FileValidationResult {
  if (buffer.length === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File exceeds maximum size of 25MB' };
  }

  const lowerName = fileName.toLowerCase();
  const matchedExt = ALLOWED_EXTENSIONS.find((ext) => lowerName.endsWith(ext));
  if (!matchedExt) {
    return {
      valid: false,
      error: `Unsupported file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  const { valid: magicValid, detectedType } = verifyMagicBytes(buffer);
  if (!magicValid) {
    return {
      valid: false,
      error: 'File content signature does not match allowed document or image format',
    };
  }

  // Check matching between extension and signature
  if (matchedExt === '.pdf' && detectedType !== 'pdf') {
    return { valid: false, error: 'File extension .pdf does not match PDF content signature' };
  }
  if (matchedExt === '.png' && detectedType !== 'png') {
    return { valid: false, error: 'File extension .png does not match PNG content signature' };
  }
  if ((matchedExt === '.jpg' || matchedExt === '.jpeg') && detectedType !== 'jpeg') {
    return { valid: false, error: 'File extension .jpg/.jpeg does not match JPEG content signature' };
  }
  if ((matchedExt === '.ai' || matchedExt === '.eps') && detectedType !== 'postscript' && detectedType !== 'pdf') {
    // Adobe Illustrator often saves with an embedded PDF header (%PDF) or PostScript (%!)
    return { valid: false, error: 'Artwork file signature is not recognized as valid AI/EPS/PDF format' };
  }

  return { valid: true, detectedType };
}
