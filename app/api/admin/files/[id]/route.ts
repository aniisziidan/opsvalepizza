import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Enforce admin authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // 2. Query StoredFile
  const storedFile = await prisma.storedFile.findUnique({
    where: { id },
  });

  if (!storedFile) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // 3. Check storage existence
  const exists = await storage.exists(storedFile.storageKey);
  if (!exists) {
    return NextResponse.json({ error: 'Underlying file storage not found' }, { status: 404 });
  }

  // 4. Retrieve buffer and return with safe attachment headers
  const buffer = await storage.getBuffer(storedFile.storageKey);
  const sanitizedFileName = storedFile.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': storedFile.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizedFileName}"`,
      'Content-Length': String(storedFile.sizeBytes),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    },
  });
}
