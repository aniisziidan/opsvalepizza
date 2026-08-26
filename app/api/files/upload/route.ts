import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';
import { validateUploadedFile } from '@/lib/validation/fileUpload';
import { rateLimiter, getClientIp } from '@/lib/security/rateLimiter';

export async function POST(req: Request) {
  // 1. Rate limiting: 10 uploads per 60 seconds per IP
  const clientIp = getClientIp(req);
  const rateLimit = await rateLimiter.check(`upload:${clientIp}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment before uploading more files.' },
      { status: 429 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided in form data.' }, { status: 400 });
    }

    const fileName = (file as File).name || 'upload.pdf';
    const mimeType = file.type || 'application/octet-stream';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Validate file (magic bytes, extension, MIME, max 25MB)
    const validation = validateUploadedFile(fileName, mimeType, buffer);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid file' }, { status: 400 });
    }

    // 3. Generate UUID storage key and public token
    const token = crypto.randomUUID();
    const storageKey = `${token}-${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    // 4. Save to storage
    await storage.save(storageKey, buffer, mimeType);

    // 5. Save TemporaryUpload record in DB
    await prisma.temporaryUpload.create({
      data: {
        token,
        storageKey,
        fileName,
        mimeType,
        sizeBytes: buffer.length,
        status: 'TEMPORARY',
        expiresAt,
      },
    });

    return NextResponse.json({
      uploadToken: token,
      fileName,
      sizeBytes: buffer.length,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to process file upload.' }, { status: 500 });
  }
}
