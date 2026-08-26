import { describe, it, expect, vi } from 'vitest';
import {
  normalizeCompanyName,
  extractNormalizedDomain,
  matchOrCreateCompany,
} from '../matchOrCreateCompany';
import type { Prisma } from '@prisma/client';

describe('Company normalization helpers', () => {
  it('normalizes company names to clean lowercase alphanumeric strings', () => {
    expect(normalizeCompanyName('Pizza Planet EU GmbH')).toBe('pizzaplaneteugmbh');
    expect(normalizeCompanyName('Mario & Luigi Pizza! (Rome)')).toBe('marioluigipizzarome');
    expect(normalizeCompanyName('  Super-Pizza 2026   ')).toBe('superpizza2026');
  });

  it('extracts normalized website domains', () => {
    expect(extractNormalizedDomain('https://www.pizzaplanet.eu/menu')).toBe('pizzaplanet.eu');
    expect(extractNormalizedDomain('HTTP://PIZZAPLANET.EU')).toBe('pizzaplanet.eu');
    expect(extractNormalizedDomain('pizzaplanet.it')).toBe('pizzaplanet.it');
    expect(extractNormalizedDomain('   ')).toBe(null);
    expect(extractNormalizedDomain(null)).toBe(null);
  });
});

describe('matchOrCreateCompany', () => {
  it('matches by domain when domain is found', async () => {
    const mockTx = {
      company: {
        findFirst: vi.fn().mockResolvedValueOnce({ id: 'comp-123', name: 'Existing Co' }),
        create: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient;

    const res = await matchOrCreateCompany(mockTx, {
      name: 'Different Name',
      websiteUrl: 'https://pizzaplanet.eu',
      countryCode: 'IT',
      branchRange: '6-20',
    });

    expect(res).toEqual({ id: 'comp-123', isNew: false });
    expect(mockTx.company.findFirst).toHaveBeenCalledWith({
      where: { normalizedWebsiteDomain: 'pizzaplanet.eu' },
    });
    expect(mockTx.company.create).not.toHaveBeenCalled();
  });

  it('matches by name and country when domain not found', async () => {
    const mockTx = {
      company: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(null) // domain lookup fails
          .mockResolvedValueOnce({ id: 'comp-456', name: 'Pizza Express' }), // name+country matches
        create: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient;

    const res = await matchOrCreateCompany(mockTx, {
      name: 'Pizza Express',
      websiteUrl: 'https://otherdomain.com',
      countryCode: 'DE',
      branchRange: '21-50',
    });

    expect(res).toEqual({ id: 'comp-456', isNew: false });
  });

  it('creates new company when no matches found', async () => {
    const mockTx = {
      company: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValueOnce({ id: 'comp-new-789' }),
      },
    } as unknown as Prisma.TransactionClient;

    const res = await matchOrCreateCompany(mockTx, {
      name: 'Brand New Pizzeria',
      websiteUrl: 'https://newpizzeria.eu',
      countryCode: 'FR',
      branchRange: '1-5',
    });

    expect(res).toEqual({ id: 'comp-new-789', isNew: true });
    expect(mockTx.company.create).toHaveBeenCalledWith({
      data: {
        name: 'Brand New Pizzeria',
        normalizedName: 'brandnewpizzeria',
        website: 'https://newpizzeria.eu',
        normalizedWebsiteDomain: 'newpizzeria.eu',
        countryCode: 'FR',
        branchRange: '1-5',
        branchCountMin: 1,
        branchCountMax: 5,
        branchCount: 1,
      },
    });
  });
});
