import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Storage adapter interface for file uploads.
 */
export interface StorageAdapter {
  save(key: string, buffer: Buffer, mimeType?: string): Promise<void>;
  getStream(key: string): Promise<Readable>;
  getBuffer(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export class LocalDiskAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir: string = path.join(process.cwd(), 'uploads')) {
    this.baseDir = baseDir;
    if (!fsSync.existsSync(this.baseDir)) {
      fsSync.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(key: string): string {
    const safeKey = path.basename(key);
    return path.join(this.baseDir, safeKey);
  }

  async save(key: string, buffer: Buffer, _mimeType?: string): Promise<void> {
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

export interface S3StorageConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private sanitizeKey(key: string): string {
    return key.replace(/^\/+/, '');
  }

  async save(key: string, buffer: Buffer, mimeType?: string): Promise<void> {
    const cleanKey = this.sanitizeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      })
    );
  }

  async getStream(key: string): Promise<Readable> {
    const cleanKey = this.sanitizeKey(key);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      })
    );

    if (!response.Body) {
      throw new Error(`S3 object body is empty: ${cleanKey}`);
    }

    return response.Body as Readable;
  }

  async getBuffer(key: string): Promise<Buffer> {
    const stream = await this.getStream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    const cleanKey = this.sanitizeKey(key);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      })
    );
  }

  async exists(key: string): Promise<boolean> {
    const cleanKey = this.sanitizeKey(key);
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        })
      );
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }
}

/**
 * Validates storage environment configuration and constructs the authoritative StorageAdapter.
 * Fails fast on partial S3 configuration without silent degradation in production.
 */
export function createStorageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER;
  const s3Bucket = process.env.S3_BUCKET;

  const isS3Requested = provider === 's3' || Boolean(s3Bucket);

  if (isS3Requested) {
    const missing: string[] = [];
    if (!process.env.S3_BUCKET) missing.push('S3_BUCKET');
    if (!process.env.S3_ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID');
    if (!process.env.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY');
    if (!process.env.S3_REGION && !process.env.S3_ENDPOINT) {
      missing.push('S3_REGION or S3_ENDPOINT');
    }

    if (missing.length > 0) {
      throw new Error(
        `[StorageConfigError] S3 storage requested but required variables are missing: ${missing.join(
          ', '
        )}`
      );
    }

    return new S3StorageAdapter({
      bucket: process.env.S3_BUCKET!,
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    });
  }

  return new LocalDiskAdapter();
}

// Global storage singleton
export const storage: StorageAdapter = createStorageAdapter();
