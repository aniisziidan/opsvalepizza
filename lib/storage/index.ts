import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

/**
 * Storage adapter interface for file uploads.
 * Development uses LocalDiskAdapter (uploads/<key>).
 * Production uses MinioAdapter/S3Adapter (Phase 7).
 */
export interface StorageAdapter {
  save(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  getStream(key: string): Promise<Readable>;
  getBuffer(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export class LocalDiskAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir: string = path.join(process.cwd(), 'uploads')) {
    this.baseDir = baseDir;
    // Ensure uploads directory exists synchronously on startup
    if (!fsSync.existsSync(this.baseDir)) {
      fsSync.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(key: string): string {
    // Prevent path traversal
    const safeKey = path.basename(key);
    return path.join(this.baseDir, safeKey);
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.resolvePath(key);
    await fs.writeFile(filePath, buffer);
  }

  async getStream(key: string): Promise<Readable> {
    const filePath = this.resolvePath(key);
    return fsSync.createReadStream(filePath);
  }

  async getBuffer(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      // Ignore if file already deleted
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Global storage singleton
export const storage: StorageAdapter = new LocalDiskAdapter();
