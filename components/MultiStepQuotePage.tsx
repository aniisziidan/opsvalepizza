'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalculatorState, Lead } from '@/lib/types';

interface MultiStepQuotePageProps {
  initialCalcState?: CalculatorState | null;
  estimatedSavings?: number;
}

export const MultiStepQuotePage: React.FC<MultiStepQuotePageProps> = ({
  initialCalcState,
  estimatedSavings = 12400,
}) => {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedLeadCode, setSubmittedLeadCode] = useState<string>('');

  // Step 1: Company
  const [companyName, setCompanyName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [workEmail, setWorkEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [branches, setBranches] = useState<string>('1-5');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');

  // Step 2: Specs
  const [primarySize, setPrimarySize] = useState<string>(
    initialCalcState ? `${initialCalcState.boxSize}` : '32cm'
  );
  const [material, setMaterial] = useState<string>(
    initialCalcState ? initialCalcState.material : 'kraft'
  );
  const [printType, setPrintType] = useState<string>(
    initialCalcState ? initialCalcState.print : 'custom'
  );
  const [monthlyVolume, setMonthlyVolume] = useState<number>(
    initialCalcState ? initialCalcState.monthlyVolume : 50000
  );
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: string; type: string }>>([
    { name: 'brand_logo_specs.ai', size: '2.8 MB', type: 'ai' }
  ]);

  // Step 3: Delivery
  const [deliveryCountry, setDeliveryCountry] = useState<string>(
    initialCalcState?.country || 'IT'
  );
  const [deliveryCity, setDeliveryCity] = useState<string>('Milan');
  const [deliveryFrequency, setDeliveryFrequency] = useState<string>('Bi-weekly Pallet Drops');
  const [hasDock, setHasDock] = useState<boolean>(true);

  // Step 4: Notes
  const [notes, setNotes] = useState<string>(
    'We are looking to transition our entire EU operations to a single supplier for our standard pizza boxes. Please provide pricing for quarterly deliveries to our central hubs.'
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateStep1 = () => {
    const errs: { [key: string]: string } = {};
    if (!companyName.trim()) errs.companyName = 'Company name is required';
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!workEmail.trim() || !workEmail.includes('@')) errs.workEmail = 'Valid work email is required';
    if (!phoneNumber.trim()) errs.phoneNumber = 'Phone number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
    }
    setStep(step + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCode = `LD-${Math.floor(8000 + Math.random() * 1999)}`;
    setSubmittedLeadCode(newCode);

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      code: newCode,
      companyName: companyName || 'New Italian Pizzeria Chain',
      contactName: fullName || 'Lead Representative',
      jobTitle: jobTitle || 'Procurement Officer',
      email: workEmail || 'contact@pizzeriagroup.com',
      phone: phoneNumber || '+39 02 8888 9999',
      location: `${deliveryCity}, ${deliveryCountry}`,
      branches: branches,
      website: websiteUrl || 'https://example-pizzeria.com',
      status: 'New',
      createdAt: 'Just now',
      calculatorData: {
        primaryBoxSize: `${primarySize} Box`,
        monthlyVolume: monthlyVolume,
        boxesPerOrder: Math.round(monthlyVolume / 3),
        currentPrice: 0.35,
        estimatedSavingsYearly: estimatedSavings,
        deliveryCountry: deliveryCountry,
        currentSupplierType: 'Direct inquiry',
        materialPreference: material === 'kraft' ? 'Kraft Brown' : 'White Bleached',
        printType: printType === 'custom' ? 'Custom Printed (1-3 colors)' : 'Plain (No Print)',
      },
      quoteDetails: {
        submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        customerNotes: notes,
        uploadedFiles: uploadedFiles
      },
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          timestamp: 'Just now',
          author: fullName || 'Online Customer',
          type: 'created',
          content: `Submitted wholesale quote request (${newCode})`
        }
      ]
    };

    // Persistence arrives in Phase 1 (DB). For now the submission is
    // confirmed in-page only; `newLead` documents the payload shape.
    void newLead;
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 px-4">
        <div className="bg-white border border-[#c5c6ce] p-8 sm:p-12 rounded-xl shadow-xl text-center">
          <div className="w-16 h-16 bg-[#eff4ff] text-[#e77114] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-2 font-bold">
            Quote Request Confirmed
          </span>
          <h2 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632] mb-4">
            Thank You, {fullName || 'Partner'}!
          </h2>
          <p className="font-body text-base text-[#44474d] max-w-xl mx-auto mb-8 leading-relaxed">
            Your quote request <strong className="text-[#041632] font-mono-data">{submittedLeadCode}</strong> for <strong className="text-[#041632]">{companyName}</strong> has been logged directly into our European logistics dispatch desk. A dedicated procurement account manager will reach out within 4 hours.
          </p>

          <div className="bg-[#eff4ff] border border-[#c5c6ce] p-6 rounded-lg max-w-md mx-auto text-left mb-8 font-mono-data text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#44474d]">Target Box Size:</span>
              <span className="font-bold text-[#041632]">{primarySize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#44474d]">Monthly Volume:</span>
              <span className="font-bold text-[#041632]">{monthlyVolume.toLocaleString()} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#44474d]">Delivery Destination:</span>
              <span className="font-bold text-[#041632]">{deliveryCity}, {deliveryCountry}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
              className="bg-[#041632] text-white px-8 py-3.5 rounded-lg font-mono-data text-xs uppercase tracking-wider hover:bg-[#1b2b48] transition-colors cursor-pointer font-bold"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto pt-8 sm:pt-16 pb-24 px-4 sm:px-8">
      {/* Stepper */}
      <div className="mb-10 sm:mb-12 flex justify-between items-center relative">
        <div className="absolute left-0 top-1/2 w-full h-px bg-[#c5c6ce] -z-10 transform -translate-y-1/2"></div>
        
        {/* Step 1 */}
        <div className="flex flex-col items-center gap-2 bg-[#f8f9ff] px-2 sm:px-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-data text-xs font-bold ring-4 ring-[#f8f9ff] ${
            step >= 1 ? 'bg-[#041632] text-white' : 'bg-[#dce9ff] text-[#44474d]'
          }`}>
            1
          </div>
          <span className={`font-mono-data text-xs ${step >= 1 ? 'text-[#041632] font-bold' : 'text-[#44474d]'}`}>
            Company
          </span>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center gap-2 bg-[#f8f9ff] px-2 sm:px-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-data text-xs font-bold ring-4 ring-[#f8f9ff] ${
            step >= 2 ? 'bg-[#041632] text-white' : 'bg-[#dce9ff] text-[#44474d]'
          }`}>
            2
          </div>
          <span className={`font-mono-data text-xs ${step >= 2 ? 'text-[#041632] font-bold' : 'text-[#44474d]'}`}>
            Specs
          </span>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center gap-2 bg-[#f8f9ff] px-2 sm:px-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-data text-xs font-bold ring-4 ring-[#f8f9ff] ${
            step >= 3 ? 'bg-[#041632] text-white' : 'bg-[#dce9ff] text-[#44474d]'
          }`}>
            3
          </div>
          <span className={`font-mono-data text-xs ${step >= 3 ? 'text-[#041632] font-bold' : 'text-[#44474d]'}`}>
            Delivery
          </span>
        </div>

        {/* Step 4 */}
        <div className="flex flex-col items-center gap-2 bg-[#f8f9ff] px-2 sm:px-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-data text-xs font-bold ring-4 ring-[#f8f9ff] ${
            step >= 4 ? 'bg-[#041632] text-white' : 'bg-[#dce9ff] text-[#44474d]'
          }`}>
            4
          </div>
          <span className={`font-mono-data text-xs ${step >= 4 ? 'text-[#041632] font-bold' : 'text-[#44474d]'}`}>
            Review
          </span>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white border border-[#c5c6ce] shadow-[0px_4px_20px_rgba(27,43,72,0.08)] rounded-xl overflow-hidden">
        {/* Step 1: Company Information */}
        {step === 1 && (
          <div>
            <div className="p-6 sm:p-10 md:p-12">
              <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632] mb-2">
                Company Information
              </h1>
              <p className="font-body text-sm sm:text-base text-[#44474d] mb-8">
                Please provide your details so we can assign an account manager.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Pizza Planet EU"
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] focus:border-[#041632] font-body text-base outline-none"
                  />
                  {errors.companyName && <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.companyName}</p>}
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Marco Rossi"
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] focus:border-[#041632] font-body text-base outline-none"
                  />
                  {errors.fullName && <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Procurement Director"
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] focus:border-[#041632] font-body text-base outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    placeholder="m.rossi@company.eu"
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] focus:border-[#041632] font-body text-base outline-none"
                  />
                  {errors.workEmail && <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.workEmail}</p>}
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+39 02 1234 5678"
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] focus:border-[#041632] font-body text-base outline-none"
                  />
                  {errors.phoneNumber && <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.phoneNumber}</p>}
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Number of Branches *
                  </label>
                  <select
                    value={branches}
                    onChange={(e) => setBranches(e.target.value)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] focus:border-[#041632] font-body text-base outline-none appearance-none"
                  >
                    <option value="1-5">1-5</option>
                    <option value="6-20">6-20</option>
                    <option value="21-50">21-50</option>
                    <option value="50+">50+</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://pizzaplanet.eu"
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] focus:border-[#041632] font-body text-base outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#eff4ff] px-6 sm:px-12 py-5 border-t border-[#c5c6ce] flex justify-between items-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="font-mono-data text-xs text-[#44474d] hover:text-[#041632] transition-colors flex items-center gap-2 cursor-pointer uppercase font-semibold"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="bg-[#041632] text-white font-mono-data text-xs px-8 py-3 rounded-lg hover:bg-[#1b2b48] transition-colors shadow-md flex items-center gap-2 cursor-pointer uppercase font-bold"
              >
                Next Step
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Packaging Specifications */}
        {step === 2 && (
          <div>
            <div className="p-6 sm:p-10 md:p-12 space-y-6">
              <h2 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632] mb-2">
                Packaging Specifications
              </h2>
              <p className="font-body text-sm sm:text-base text-[#44474d]">
                Configure the primary sizes, material preferences, and custom artwork requirements.
              </p>

              <div className="space-y-6 pt-2">
                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Primary Box Size
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['28cm (11")', '32cm (13")', '40cm (16")'].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setPrimarySize(sz)}
                        className={`p-4 border rounded-lg text-center font-body text-sm cursor-pointer transition-all ${
                          primarySize.includes(sz.slice(0, 4))
                            ? 'border-[#041632] bg-[#dce9ff] text-[#041632] font-bold'
                            : 'border-[#c5c6ce] hover:bg-[#f8f9ff]'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                      Material Option
                    </label>
                    <select
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm"
                    >
                      <option value="kraft">Kraft Brown (Heavyweight Food Safe)</option>
                      <option value="white">Pure White (Bleached Food Grade)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                      Print Requirement
                    </label>
                    <select
                      value={printType}
                      onChange={(e) => setPrintType(e.target.value)}
                      className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm"
                    >
                      <option value="custom">Custom Flexo Print (1-3 Colors)</option>
                      <option value="plain">Plain / Generic (No Print)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Estimated Monthly Volume
                  </label>
                  <input
                    type="number"
                    value={monthlyVolume}
                    step="5000"
                    onChange={(e) => setMonthlyVolume(parseInt(e.target.value) || 10000)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm"
                  />
                </div>

                {/* Upload artwork simulation */}
                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Artwork / Brand Guidelines (Optional)
                  </label>
                  <div className="border-2 border-dashed border-[#c5c6ce] hover:border-[#041632] bg-[#f8f9ff] p-6 rounded-lg text-center cursor-pointer">
                    <span className="material-symbols-outlined text-3xl text-[#44474d] mb-2">upload_file</span>
                    <p className="font-body text-sm text-[#041632] font-semibold">Click or drag artwork files here</p>
                    <p className="font-mono-data text-xs text-[#75777e] mt-1">Accepts .AI, .PDF, .EPS, .PNG (Max 25MB)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#eff4ff] px-6 sm:px-12 py-5 border-t border-[#c5c6ce] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="font-mono-data text-xs text-[#44474d] hover:text-[#041632] transition-colors flex items-center gap-2 cursor-pointer uppercase font-semibold"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="bg-[#041632] text-white font-mono-data text-xs px-8 py-3 rounded-lg hover:bg-[#1b2b48] transition-colors shadow-md flex items-center gap-2 cursor-pointer uppercase font-bold"
              >
                Next Step
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Logistics & Delivery */}
        {step === 3 && (
          <div>
            <div className="p-6 sm:p-10 md:p-12 space-y-6">
              <h2 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632] mb-2">
                Logistics &amp; Hub Routing
              </h2>
              <p className="font-body text-sm sm:text-base text-[#44474d]">
                Define your primary receiving warehouse location and dispatch cadence.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Destination Country
                  </label>
                  <select
                    value={deliveryCountry}
                    onChange={(e) => setDeliveryCountry(e.target.value)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm"
                  >
                    <option value="IT">Italy</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="ES">Spain</option>
                    <option value="UK">United Kingdom</option>
                    <option value="NL">Netherlands</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Primary City / Central Hub
                  </label>
                  <input
                    type="text"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    placeholder="e.g. Milan, Munich, Paris"
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm"
                  />
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Delivery Cadence
                  </label>
                  <select
                    value={deliveryFrequency}
                    onChange={(e) => setDeliveryFrequency(e.target.value)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm"
                  >
                    <option value="Bi-weekly Pallet Drops">Bi-weekly Pallet Drops</option>
                    <option value="Monthly Bulk Truckload">Monthly Bulk Truckload</option>
                    <option value="Weekly Scheduled Drops">Weekly Scheduled Drops</option>
                    <option value="On-demand Buffer Release">On-demand Buffer Release</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="hasDock"
                    checked={hasDock}
                    onChange={(e) => setHasDock(e.target.checked)}
                    className="w-5 h-5 text-[#041632] rounded border-[#c5c6ce] focus:ring-[#041632]"
                  />
                  <label htmlFor="hasDock" className="font-body text-sm text-[#0b1c30] cursor-pointer">
                    Receiving facility has dedicated forklift / loading dock
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-[#eff4ff] px-6 sm:px-12 py-5 border-t border-[#c5c6ce] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="font-mono-data text-xs text-[#44474d] hover:text-[#041632] transition-colors flex items-center gap-2 cursor-pointer uppercase font-semibold"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="bg-[#041632] text-white font-mono-data text-xs px-8 py-3 rounded-lg hover:bg-[#1b2b48] transition-colors shadow-md flex items-center gap-2 cursor-pointer uppercase font-bold"
              >
                Review Quote
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Final Review & Submission */}
        {step === 4 && (
          <form onSubmit={handleSubmit}>
            <div className="p-6 sm:p-10 md:p-12 space-y-6">
              <h2 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632] mb-2">
                Review &amp; Submit Request
              </h2>
              <p className="font-body text-sm sm:text-base text-[#44474d]">
                Verify your submission details before transmitting to our European procurement team.
              </p>

              {/* Summary table */}
              <div className="bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-6 space-y-3 font-mono-data text-xs">
                <div className="flex justify-between border-b border-[#c5c6ce]/50 pb-2">
                  <span className="text-[#44474d]">Company:</span>
                  <span className="font-bold text-[#041632]">{companyName} ({branches} branches)</span>
                </div>
                <div className="flex justify-between border-b border-[#c5c6ce]/50 pb-2">
                  <span className="text-[#44474d]">Primary Contact:</span>
                  <span className="font-bold text-[#041632]">{fullName} ({workEmail})</span>
                </div>
                <div className="flex justify-between border-b border-[#c5c6ce]/50 pb-2">
                  <span className="text-[#44474d]">Packaging Specs:</span>
                  <span className="font-bold text-[#041632]">{primarySize} - {material.toUpperCase()} - {printType}</span>
                </div>
                <div className="flex justify-between border-b border-[#c5c6ce]/50 pb-2">
                  <span className="text-[#44474d]">Monthly Volume:</span>
                  <span className="font-bold text-[#041632]">{monthlyVolume.toLocaleString()} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#44474d]">Delivery Routing:</span>
                  <span className="font-bold text-[#041632]">{deliveryCity}, {deliveryCountry} ({deliveryFrequency})</span>
                </div>
              </div>

              <div>
                <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                  Additional Notes &amp; Special Requirements
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-4 font-body text-sm"
                />
              </div>
            </div>

            <div className="bg-[#eff4ff] px-6 sm:px-12 py-5 border-t border-[#c5c6ce] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="font-mono-data text-xs text-[#44474d] hover:text-[#041632] transition-colors flex items-center gap-2 cursor-pointer uppercase font-semibold"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Previous
              </button>
              <button
                type="submit"
                className="bg-[#e77114] text-white font-mono-data text-xs px-8 py-3.5 rounded-lg hover:bg-[#c25e10] transition-colors shadow-lg flex items-center gap-2 cursor-pointer uppercase font-bold"
              >
                Submit Quote Request
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
