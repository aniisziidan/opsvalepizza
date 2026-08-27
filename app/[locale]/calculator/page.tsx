import React from 'react';
import { SavingsCalculatorPage } from '@/components/SavingsCalculatorPage';

interface LocalizedCalculatorProps {
  searchParams: Promise<{ volume?: string }>;
}

export default async function LocalizedCalculatorPage({ searchParams }: LocalizedCalculatorProps) {
  const { volume } = await searchParams;
  const initialVolume = volume ? parseInt(volume, 10) || 20000 : 20000;

  return <SavingsCalculatorPage initialVolume={initialVolume} />;
}
