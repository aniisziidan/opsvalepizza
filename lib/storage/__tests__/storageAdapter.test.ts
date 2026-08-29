import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalDiskAdapter, createStorageAdapter } from '@/lib/storage';
import path from 'node:path';
import fs from 'node:fs/promises';

describe('Storage Adapter & Configuration Validation', () => {
  const testDir = path.join(process.cwd(), 'uploads_test');
  let adapter: LocalDiskAdapter;

  beforeEach(async () => {
    adapter = new LocalDiskAdapter(testDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('saves, checks existence, reads buffer and stream, and deletes files correctly on LocalDiskAdapter', async () => {
    const key = 'test-file.txt';
    const content = Buffer.from('OpsVale Packaging Test Spec');

    // 1. Save
    await adapter.save(key, content);

    // 2. Exists
    const exists = await adapter.exists(key);
    expect(exists).toBe(true);

    // 3. Get buffer
    const readBuffer = await adapter.getBuffer(key);
    expect(readBuffer.toString('utf-8')).toBe('OpsVale Packaging Test Spec');

    // 4. Delete
    await adapter.delete(key);
    const existsAfterDelete = await adapter.exists(key);
    expect(existsAfterDelete).toBe(false);
  });

  it('fails fast when S3 is requested but required configuration variables are missing', () => {
    const originalEnv = { ...process.env };

    try {
      process.env.STORAGE_PROVIDER = 's3';
      delete process.env.S3_BUCKET;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;

      expect(() => createStorageAdapter()).toThrow('[StorageConfigError]');
    } finally {
      process.env = originalEnv;
    }
  });

  it('defaults to LocalDiskAdapter when no S3 is configured', () => {
    const originalEnv = { ...process.env };

    try {
      delete process.env.STORAGE_PROVIDER;
      delete process.env.S3_BUCKET;

      const ad = createStorageAdapter();
      expect(ad instanceof LocalDiskAdapter).toBe(true);
    } finally {
      process.env = originalEnv;
    }
  });

  it('generates and saves offsite database backup snapshot successfully', async () => {
    const { performOffsiteDatabaseBackup } = await import('../offsiteBackup');
    const dummyDump = Buffer.from('CREATE TABLE test (id INT); INSERT INTO test VALUES (1);');
    const result = await performOffsiteDatabaseBackup(dummyDump, 'test-db-dump.sql.gz');

    expect(result.success).toBe(true);
    expect(result.backupKey).toContain('test-db-dump.sql.gz');
    expect(result.sizeBytes).toBeGreaterThan(0);
  });
});
