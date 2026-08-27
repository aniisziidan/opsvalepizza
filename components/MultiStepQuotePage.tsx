'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CalculatorState } from '@/lib/types';
import {
  step1CompanySchema,
  step2SpecsSchema,
  step3LogisticsSchema,
  STANDARD_SIZES_MM,
  type BranchRange,
  type Step1CompanyInput,
  type Step2SpecsInput,
  type Step3LogisticsInput,
} from '@/lib/validation/quoteRequest';
import { submitQuoteRequest } from '@/app/quote/actions';
import { useTranslation } from '@/lib/i18n/context';

interface UploadedItem {
  token: string;
  name: string;
  sizeFormatted: string;
}

interface MultiStepQuotePageProps {
  initialCalcState?: CalculatorState | null;
  estimatedSavings?: number;
}

export const MultiStepQuotePage: React.FC<MultiStepQuotePageProps> = ({
  initialCalcState,
}) => {
  const router = useRouter();
  const { locale } = useTranslation();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedLeadCode, setSubmittedLeadCode] = useState<string>('');
  const [serverError, setServerError] = useState<string>('');

  // Security: idempotency and bot cooldown initialized lazily on client
  const [idempotencyKey] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return '10000000-1000-4000-8000-100000000000';
  });
  const [formMountedAt] = useState<number>(() => Date.now());
  const [honeypot, setHoneypot] = useState<string>('');

  // Step 1: Company Information
  const [companyName, setCompanyName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [workEmail, setWorkEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [branches, setBranches] = useState<BranchRange>('1-5');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');

  // Step 2: Packaging Specifications
  const [specType, setSpecType] = useState<'STANDARD' | 'CUSTOM'>('STANDARD');
  const [standardSize, setStandardSize] = useState<string>(
    initialCalcState ? initialCalcState.boxSize : '32cm',
  );
  const [lengthMm, setLengthMm] = useState<number>(
    initialCalcState ? (STANDARD_SIZES_MM[initialCalcState.boxSize]?.lengthMm ?? 320) : 320,
  );
  const [widthMm, setWidthMm] = useState<number>(
    initialCalcState ? (STANDARD_SIZES_MM[initialCalcState.boxSize]?.widthMm ?? 320) : 320,
  );
  const [heightMm, setHeightMm] = useState<number>(
    initialCalcState ? (STANDARD_SIZES_MM[initialCalcState.boxSize]?.heightMm ?? 40) : 40,
  );
  const [material, setMaterial] = useState<'kraft' | 'white'>(
    initialCalcState ? initialCalcState.material : 'kraft',
  );
  const [printType, setPrintType] = useState<'plain' | 'custom'>(
    initialCalcState ? initialCalcState.print : 'custom',
  );
  const [customFlute, setCustomFlute] = useState<string>('');
  const [monthlyVolume, setMonthlyVolume] = useState<number>(
    initialCalcState ? initialCalcState.monthlyVolume : 50000,
  );

  // File uploads
  const [uploadedFiles, setUploadedFiles] = useState<UploadedItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Logistics & Delivery
  const [deliveryCountry, setDeliveryCountry] = useState<string>(
    initialCalcState?.country || 'IT',
  );
  const [deliveryCity, setDeliveryCity] = useState<string>('');
  const [deliveryFrequency, setDeliveryFrequency] = useState<string>('Bi-weekly Pallet Drops');
  const [hasDock, setHasDock] = useState<boolean>(true);
  const [accessNotes, setAccessNotes] = useState<string>('');

  // Step 4: Notes
  const [notes, setNotes] = useState<string>('');

  // Validation Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleStandardSizeSelect = (sz: string) => {
    setStandardSize(sz);
    const standardDims = STANDARD_SIZES_MM[sz];
    if (standardDims) {
      setLengthMm(standardDims.lengthMm);
      setWidthMm(standardDims.widthMm);
      setHeightMm(standardDims.heightMm);
    }
  };

  const handleFileUpload = async (filesToUpload: FileList | null) => {
    if (!filesToUpload || filesToUpload.length === 0) return;
    if (uploadedFiles.length + filesToUpload.length > 5) {
      setUploadError('Maximum 5 files can be attached per quote.');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        if (file.size > 25 * 1024 * 1024) {
          setUploadError(`File ${file.name} exceeds the 25MB limit.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          setUploadError(data.error || `Failed to upload ${file.name}`);
        } else {
          setUploadedFiles((prev) => [
            ...prev,
            {
              token: data.uploadToken,
              name: data.fileName,
              sizeFormatted: formatFileSize(data.sizeBytes),
            },
          ]);
        }
      }
    } catch {
      setUploadError('Network error during file upload. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeUploadedFile = (tokenToRemove: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.token !== tokenToRemove));
  };

  const validateStep = (currentStep: number): boolean => {
    setErrors({});
    setServerError('');

    if (currentStep === 1) {
      const result = step1CompanySchema.safeParse({
        fullName,
        companyName,
        jobTitle,
        workEmail,
        phoneNumber,
        branches,
        websiteUrl,
      } as Step1CompanyInput);

      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string;
          if (field) errs[field] = issue.message;
        }
        setErrors(errs);
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      const result = step2SpecsSchema.safeParse({
        boxSpecificationType: specType,
        standardBoxSize: specType === 'STANDARD' ? standardSize : undefined,
        lengthMm,
        widthMm,
        heightMm,
        material,
        printType,
        monthlyVolume,
        customFlute,
        uploadTokens: uploadedFiles.map((f) => f.token),
      } as Step2SpecsInput);

      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string;
          if (field) errs[field] = issue.message;
        }
        setErrors(errs);
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      const result = step3LogisticsSchema.safeParse({
        deliveryCountry,
        deliveryCity,
        deliveryFrequency,
        hasLoadingDock: hasDock,
        deliveryAccessNotes: accessNotes,
      } as Step3LogisticsInput);

      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string;
          if (field) errs[field] = issue.message;
        }
        setErrors(errs);
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    const payload = {
      fullName,
      companyName,
      jobTitle,
      workEmail,
      phoneNumber,
      branches,
      websiteUrl,
      boxSpecificationType: specType,
      standardBoxSize: specType === 'STANDARD' ? standardSize : undefined,
      lengthMm,
      widthMm,
      heightMm,
      material,
      printType,
      monthlyVolume,
      customFlute,
      uploadTokens: uploadedFiles.map((f) => f.token),
      deliveryCountry,
      deliveryCity,
      deliveryFrequency,
      hasLoadingDock: hasDock,
      deliveryAccessNotes: accessNotes,
      notes,
      _hp_company_fax_: honeypot,
      formMountedAt,
      idempotencyKey: idempotencyKey || crypto.randomUUID(),
      calcState: initialCalcState || null,
    };

    try {
      const res = await submitQuoteRequest(payload);
      if (res.success && res.leadCode) {
        setSubmittedLeadCode(res.leadCode);
        setIsSubmitted(true);
      } else {
        if (res.errors) {
          setErrors(res.errors);
        }
        setServerError(res.error || 'Failed to submit quote request. Please try again.');
      }
    } catch {
      setServerError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
            Your quote request{' '}
            <strong className="text-[#041632] font-mono-data">{submittedLeadCode}</strong> for{' '}
            <strong className="text-[#041632]">{companyName}</strong> has been logged directly into
            our European logistics dispatch desk. A dedicated procurement account manager will
            respond with exact factory-direct pricing within{' '}
            <strong className="text-[#041632]">24 business hours</strong>.
          </p>

          <div className="bg-[#eff4ff] border border-[#c5c6ce] p-6 rounded-lg max-w-md mx-auto text-left mb-8 font-mono-data text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-[#44474d]">Reference Code:</span>
              <span className="font-bold text-[#041632]">{submittedLeadCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#44474d]">Target Packaging:</span>
              <span className="font-bold text-[#041632]">
                {specType === 'STANDARD' ? `${standardSize} Standard` : 'Custom Dimensions'} (
                {lengthMm}×{widthMm}×{heightMm}mm)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#44474d]">Material &amp; Print:</span>
              <span className="font-bold text-[#041632]">
                {material.toUpperCase()} / {printType === 'custom' ? 'Custom Printed' : 'Plain'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#44474d]">Monthly Volume:</span>
              <span className="font-bold text-[#041632]">{monthlyVolume.toLocaleString()} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#44474d]">Delivery Destination:</span>
              <span className="font-bold text-[#041632]">
                {deliveryCity}, {deliveryCountry}
              </span>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="flex justify-between">
                <span className="text-[#44474d]">Attached Files:</span>
                <span className="font-bold text-[#041632]">{uploadedFiles.length} file(s)</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push(`/${locale}`)}
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
      {/* Stepper Header */}
      <div className="mb-10 sm:mb-12 flex justify-between items-center relative">
        <div className="absolute left-0 top-1/2 w-full h-px bg-[#c5c6ce] -z-10 transform -translate-y-1/2"></div>

        {/* Step 1 */}
        <div className="flex flex-col items-center gap-2 bg-[#f8f9ff] px-2 sm:px-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-data text-xs font-bold ring-4 ring-[#f8f9ff] ${
              step >= 1 ? 'bg-[#041632] text-white' : 'bg-[#dce9ff] text-[#44474d]'
            }`}
          >
            1
          </div>
          <span
            className={`font-mono-data text-xs ${step >= 1 ? 'text-[#041632] font-bold' : 'text-[#44474d]'}`}
          >
            Company
          </span>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center gap-2 bg-[#f8f9ff] px-2 sm:px-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-data text-xs font-bold ring-4 ring-[#f8f9ff] ${
              step >= 2 ? 'bg-[#041632] text-white' : 'bg-[#dce9ff] text-[#44474d]'
            }`}
          >
            2
          </div>
          <span
            className={`font-mono-data text-xs ${step >= 2 ? 'text-[#041632] font-bold' : 'text-[#44474d]'}`}
          >
            Specs
          </span>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center gap-2 bg-[#f8f9ff] px-2 sm:px-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-data text-xs font-bold ring-4 ring-[#f8f9ff] ${
              step >= 3 ? 'bg-[#041632] text-white' : 'bg-[#dce9ff] text-[#44474d]'
            }`}
          >
            3
          </div>
          <span
            className={`font-mono-data text-xs ${step >= 3 ? 'text-[#041632] font-bold' : 'text-[#44474d]'}`}
          >
            Delivery
          </span>
        </div>

        {/* Step 4 */}
        <div className="flex flex-col items-center gap-2 bg-[#f8f9ff] px-2 sm:px-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-data text-xs font-bold ring-4 ring-[#f8f9ff] ${
              step >= 4 ? 'bg-[#041632] text-white' : 'bg-[#dce9ff] text-[#44474d]'
            }`}
          >
            4
          </div>
          <span
            className={`font-mono-data text-xs ${step >= 4 ? 'text-[#041632] font-bold' : 'text-[#44474d]'}`}
          >
            Review
          </span>
        </div>
      </div>

      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-body text-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <span>{serverError}</span>
        </div>
      )}

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
                Please provide your contact details so our European procurement team can coordinate
                your quote.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Company / Chain Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Pizza Planet EU"
                    className={`w-full bg-[#f8f9ff] border rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] outline-none font-body text-base ${
                      errors.companyName ? 'border-red-500' : 'border-[#c5c6ce]'
                    }`}
                  />
                  {errors.companyName && (
                    <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.companyName}</p>
                  )}
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
                    className={`w-full bg-[#f8f9ff] border rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] outline-none font-body text-base ${
                      errors.fullName ? 'border-red-500' : 'border-[#c5c6ce]'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Job Title <span className="text-[#75777e] normal-case">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Procurement Director"
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] outline-none font-body text-base"
                  />
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    placeholder="m.rossi@company.eu"
                    className={`w-full bg-[#f8f9ff] border rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] outline-none font-body text-base ${
                      errors.workEmail ? 'border-red-500' : 'border-[#c5c6ce]'
                    }`}
                  />
                  {errors.workEmail && (
                    <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.workEmail}</p>
                  )}
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
                    className={`w-full bg-[#f8f9ff] border rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] outline-none font-body text-base ${
                      errors.phoneNumber ? 'border-red-500' : 'border-[#c5c6ce]'
                    }`}
                  />
                  {errors.phoneNumber && (
                    <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.phoneNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Number of Branches / Locations *
                  </label>
                  <select
                    value={branches}
                    onChange={(e) => setBranches(e.target.value as BranchRange)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] outline-none font-body text-base"
                  >
                    <option value="1-5">1-5 Locations</option>
                    <option value="6-20">6-20 Locations</option>
                    <option value="21-50">21-50 Locations</option>
                    <option value="50+">50+ Locations</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Website URL <span className="text-[#75777e] normal-case">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://pizzaplanet.eu"
                    className={`w-full bg-[#f8f9ff] border rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#041632] outline-none font-body text-base ${
                      errors.websiteUrl ? 'border-red-500' : 'border-[#c5c6ce]'
                    }`}
                  />
                  {errors.websiteUrl && (
                    <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.websiteUrl}</p>
                  )}
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
                Configure standard EU pizza box sizes or specify exact custom millimetre dimensions.
              </p>

              {/* Specification Mode Toggle */}
              <div className="flex gap-4 border-b border-[#c5c6ce] pb-4">
                <button
                  type="button"
                  onClick={() => setSpecType('STANDARD')}
                  className={`pb-2 font-mono-data text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer border-b-2 ${
                    specType === 'STANDARD'
                      ? 'border-[#041632] text-[#041632]'
                      : 'border-transparent text-[#75777e] hover:text-[#041632]'
                  }`}
                >
                  Standard Presets
                </button>
                <button
                  type="button"
                  onClick={() => setSpecType('CUSTOM')}
                  className={`pb-2 font-mono-data text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer border-b-2 ${
                    specType === 'CUSTOM'
                      ? 'border-[#041632] text-[#041632]'
                      : 'border-transparent text-[#75777e] hover:text-[#041632]'
                  }`}
                >
                  Custom Exact Dimensions (mm)
                </button>
              </div>

              {specType === 'STANDARD' ? (
                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Primary Box Size Preset *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['28cm', '32cm', '40cm'].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => handleStandardSizeSelect(sz)}
                        className={`p-4 border rounded-lg text-center font-body text-sm cursor-pointer transition-all ${
                          standardSize === sz
                            ? 'border-[#041632] bg-[#dce9ff] text-[#041632] font-bold shadow-sm'
                            : 'border-[#c5c6ce] hover:bg-[#f8f9ff]'
                        }`}
                      >
                        <span className="block font-bold text-base">{sz}</span>
                        <span className="font-mono-data text-xs text-[#75777e]">
                          {STANDARD_SIZES_MM[sz]?.lengthMm}×{STANDARD_SIZES_MM[sz]?.widthMm}×
                          {STANDARD_SIZES_MM[sz]?.heightMm}mm
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#f8f9ff] border border-[#c5c6ce] p-6 rounded-lg space-y-4">
                  <span className="font-mono-data text-xs uppercase text-[#041632] font-bold block">
                    Custom Dimensions (in millimeters) *
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-mono-data text-xs text-[#44474d] mb-1 font-semibold">
                        Length (mm) *
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={1000}
                        value={lengthMm}
                        onChange={(e) => setLengthMm(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-[#c5c6ce] rounded-lg h-11 px-3 font-mono-data text-sm"
                      />
                      {errors.lengthMm && (
                        <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.lengthMm}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-mono-data text-xs text-[#44474d] mb-1 font-semibold">
                        Width (mm) *
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={1000}
                        value={widthMm}
                        onChange={(e) => setWidthMm(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-[#c5c6ce] rounded-lg h-11 px-3 font-mono-data text-sm"
                      />
                      {errors.widthMm && (
                        <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.widthMm}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-mono-data text-xs text-[#44474d] mb-1 font-semibold">
                        Height / Depth (mm) *
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={200}
                        value={heightMm}
                        onChange={(e) => setHeightMm(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-[#c5c6ce] rounded-lg h-11 px-3 font-mono-data text-sm"
                      />
                      {errors.heightMm && (
                        <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.heightMm}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Material Preference *
                  </label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value as 'kraft' | 'white')}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm outline-none"
                  >
                    <option value="kraft">Kraft Brown (Heavyweight Food Safe)</option>
                    <option value="white">Pure White (Bleached Food Grade)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Print Requirement *
                  </label>
                  <select
                    value={printType}
                    onChange={(e) => setPrintType(e.target.value as 'plain' | 'custom')}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm outline-none"
                  >
                    <option value="custom">Custom Flexo Print (1-3 Colors)</option>
                    <option value="plain">Plain / Generic (No Print)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                  Estimated Monthly Volume *
                </label>
                <input
                  type="number"
                  value={monthlyVolume}
                  step="5000"
                  min={1000}
                  onChange={(e) => setMonthlyVolume(parseInt(e.target.value) || 0)}
                  className={`w-full bg-[#f8f9ff] border rounded-lg h-12 px-4 font-body text-sm outline-none ${
                    errors.monthlyVolume ? 'border-red-500' : 'border-[#c5c6ce]'
                  }`}
                />
                {errors.monthlyVolume && (
                  <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.monthlyVolume}</p>
                )}
              </div>

              {/* Real File Upload Dropzone */}
              <div>
                <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                  Artwork / Brand Guidelines / Dielines{' '}
                  <span className="text-[#75777e] normal-case">(Optional, max 5 files, 25MB each)</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files)}
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.ai,.eps"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#c5c6ce] hover:border-[#041632] bg-[#f8f9ff] p-6 rounded-lg text-center cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-3xl text-[#44474d] mb-2">
                    upload_file
                  </span>
                  <p className="font-body text-sm text-[#041632] font-semibold">
                    {isUploading ? 'Uploading file...' : 'Click or drag artwork files here'}
                  </p>
                  <p className="font-mono-data text-xs text-[#75777e] mt-1">
                    Accepts .PDF, .PNG, .JPG, .AI, .EPS (Max 25MB)
                  </p>
                </div>

                {uploadError && (
                  <p className="text-red-600 text-xs mt-2 font-mono-data">{uploadError}</p>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.token}
                        className="flex items-center justify-between bg-[#eff4ff] border border-[#c5c6ce] px-4 py-2.5 rounded-lg text-xs font-mono-data"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="material-symbols-outlined text-base text-[#041632]">
                            description
                          </span>
                          <span className="font-bold text-[#041632] truncate">{file.name}</span>
                          <span className="text-[#75777e]">({file.sizeFormatted})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUploadedFile(file.token)}
                          className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                    Destination Country *
                  </label>
                  <select
                    value={deliveryCountry}
                    onChange={(e) => setDeliveryCountry(e.target.value)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm outline-none"
                  >
                    <option value="IT">Italy</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="ES">Spain</option>
                    <option value="UK">United Kingdom</option>
                    <option value="NL">Netherlands</option>
                    <option value="BE">Belgium</option>
                    <option value="PL">Poland</option>
                    <option value="AT">Austria</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Primary City / Receiving Hub *
                  </label>
                  <input
                    type="text"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    placeholder="e.g. Milan, Munich, Paris"
                    className={`w-full bg-[#f8f9ff] border rounded-lg h-12 px-4 font-body text-sm outline-none ${
                      errors.deliveryCity ? 'border-red-500' : 'border-[#c5c6ce]'
                    }`}
                  />
                  {errors.deliveryCity && (
                    <p className="text-red-600 text-xs mt-1 font-mono-data">{errors.deliveryCity}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                    Delivery Cadence <span className="text-[#75777e] normal-case">(Optional)</span>
                  </label>
                  <select
                    value={deliveryFrequency}
                    onChange={(e) => setDeliveryFrequency(e.target.value)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg h-12 px-4 font-body text-sm outline-none"
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
                    className="w-5 h-5 text-[#041632] rounded border-[#c5c6ce] focus:ring-[#041632] cursor-pointer"
                  />
                  <label htmlFor="hasDock" className="font-body text-sm text-[#0b1c30] cursor-pointer">
                    Receiving facility has dedicated loading dock / forklift
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
            {/* Anti-spam Honeypot */}
            <input
              type="text"
              name="_hp_company_fax_"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            <div className="p-6 sm:p-10 md:p-12 space-y-6">
              <h2 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632] mb-2">
                Review &amp; Submit Request
              </h2>
              <p className="font-body text-sm sm:text-base text-[#44474d]">
                Verify your requirements before transmitting to our European procurement desk.
              </p>

              {/* Summary table */}
              <div className="bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-6 space-y-3 font-mono-data text-xs">
                <div className="flex justify-between border-b border-[#c5c6ce]/50 pb-2">
                  <span className="text-[#44474d]">Company:</span>
                  <span className="font-bold text-[#041632]">
                    {companyName} ({branches} branches)
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#c5c6ce]/50 pb-2">
                  <span className="text-[#44474d]">Primary Contact:</span>
                  <span className="font-bold text-[#041632]">
                    {fullName} ({workEmail})
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#c5c6ce]/50 pb-2">
                  <span className="text-[#44474d]">Packaging Specs:</span>
                  <span className="font-bold text-[#041632]">
                    {specType === 'STANDARD' ? `${standardSize} Standard` : 'Custom Dimensions'} (
                    {lengthMm}×{widthMm}×{heightMm}mm) — {material.toUpperCase()} — {printType}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#c5c6ce]/50 pb-2">
                  <span className="text-[#44474d]">Monthly Volume:</span>
                  <span className="font-bold text-[#041632]">{monthlyVolume.toLocaleString()} units</span>
                </div>
                <div className="flex justify-between border-b border-[#c5c6ce]/50 pb-2">
                  <span className="text-[#44474d]">Delivery Destination:</span>
                  <span className="font-bold text-[#041632]">
                    {deliveryCity}, {deliveryCountry} ({deliveryFrequency})
                  </span>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#44474d]">Attached Files:</span>
                    <span className="font-bold text-[#041632]">{uploadedFiles.length} file(s) attached</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-mono-data text-xs text-[#0b1c30] mb-2 uppercase tracking-wider font-semibold">
                  Additional Notes &amp; Special Requirements{' '}
                  <span className="text-[#75777e] normal-case">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Any custom pallet configurations, multi-depot split drops, or specific cardboard flute requirements..."
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-4 font-body text-sm outline-none"
                />
              </div>
            </div>

            <div className="bg-[#eff4ff] px-6 sm:px-12 py-5 border-t border-[#c5c6ce] flex justify-between items-center">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep(3)}
                className="font-mono-data text-xs text-[#44474d] hover:text-[#041632] transition-colors flex items-center gap-2 cursor-pointer uppercase font-semibold disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Previous
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#e77114] text-white font-mono-data text-xs px-8 py-3.5 rounded-lg hover:bg-[#c25e10] transition-colors shadow-lg flex items-center gap-2 cursor-pointer uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Transmitting...
                  </>
                ) : (
                  <>
                    Submit Quote Request
                    <span className="material-symbols-outlined text-sm">send</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
