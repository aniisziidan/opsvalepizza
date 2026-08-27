import React from 'react';
import { HeroSection } from '@/components/HeroSection';
import { PillarsSection } from '@/components/PillarsSection';
import { CalculatorPromoSection } from '@/components/CalculatorPromoSection';

export default function LocalizedHomePage() {
  return (
    <>
      <HeroSection />
      <PillarsSection />
      <CalculatorPromoSection />
    </>
  );
}
