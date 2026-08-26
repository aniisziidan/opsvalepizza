import { describe, it, expect } from 'vitest';
import {
  validateUploadedFile,
  verifyMagicBytes,
} from '../fileUpload';

describe('fileUpload validator', () => {
  it('validates genuine PDF files by signature and extension', () => {
    // PDF magic bytes %PDF-1.4
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const res = validateUploadedFile('brand_guidelines.pdf', 'application/pdf', pdfBuffer);
    expect(res.valid).toBe(true);
    expect(res.detectedType).toBe('pdf');
  });

  it('validates genuine PNG files by signature and extension', () => {
    // PNG magic bytes
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const res = validateUploadedFile('logo.png', 'image/png', pngBuffer);
    expect(res.valid).toBe(true);
    expect(res.detectedType).toBe('png');
  });

  it('validates genuine JPEG files by signature and extension', () => {
    // JPEG magic bytes
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const res = validateUploadedFile('sample.jpg', 'image/jpeg', jpegBuffer);
    expect(res.valid).toBe(true);
    expect(res.detectedType).toBe('jpeg');
  });

  it('validates PostScript AI/EPS files', () => {
    // PostScript %!
    const psBuffer = Buffer.from([0x25, 0x21, 0x50, 0x53, 0x2d, 0x41, 0x64, 0x6f]);
    const res = validateUploadedFile('dieline.ai', 'application/illustrator', psBuffer);
    expect(res.valid).toBe(true);
  });

  it('rejects disguised executable disguised with a .pdf extension', () => {
    // Windows PE executable header MZ (0x4D, 0x5A)
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const res = validateUploadedFile('malicious.exe.pdf', 'application/pdf', exeBuffer);
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('rejects unsupported file extensions', () => {
    const txtBuffer = Buffer.from('hello world text file');
    const res = validateUploadedFile('notes.txt', 'text/plain', txtBuffer);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Unsupported file extension');
  });

  it('rejects files exceeding 25MB', () => {
    const largeBuffer = Buffer.alloc(26 * 1024 * 1024);
    // Fill first bytes with PDF signature
    largeBuffer[0] = 0x25;
    largeBuffer[1] = 0x50;
    largeBuffer[2] = 0x44;
    largeBuffer[3] = 0x46;

    const res = validateUploadedFile('large.pdf', 'application/pdf', largeBuffer);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds maximum size of 25MB');
  });
});
