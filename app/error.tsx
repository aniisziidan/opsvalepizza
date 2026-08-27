'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error to server logging service if configured
    console.error('Unhandled public application error:', error.digest || error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-between selection:bg-[#ffdeac] selection:text-[#281900]">
      {/* Brand Header */}
      <header className="bg-[#041632] text-white py-4 px-6 sm:px-12 border-b border-[#1b2b48]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#e77114] rounded flex items-center justify-center text-white font-bold">
              <span className="material-symbols-outlined text-xl">package</span>
            </div>
            <div>
              <span className="font-headline font-bold text-base text-white block">OpsVale</span>
              <span className="font-mono-data text-[9px] text-[#8393b5] uppercase tracking-wider block">
                European Wholesale Packaging
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Error Body */}
      <main className="max-w-lg mx-auto w-full p-6 text-center space-y-6 my-auto">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-3xl">warning</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-headline text-2xl font-bold text-[#041632]">
            Something went wrong
          </h1>
          <p className="font-body text-sm text-[#44474d] leading-relaxed">
            We encountered an unexpected error processing your request. Our technical operations team has been notified.
          </p>
        </div>

        {error.digest && (
          <div className="bg-[#eff4ff] border border-[#c5c6ce] rounded-lg p-2.5 font-mono-data text-[11px] text-[#75777e]">
            Reference Code: <strong className="text-[#041632]">{error.digest}</strong>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="bg-[#e77114] hover:bg-[#c25e10] text-white px-6 py-2.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer shadow-md"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="bg-white border border-[#c5c6ce] hover:bg-[#eff4ff] text-[#041632] px-6 py-2.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
          >
            Return Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#c5c6ce] py-6 px-6 text-center font-mono-data text-xs text-[#75777e]">
        <p>OpsVale European Distribution B.V. • Dedicated Support: support@opsvale.eu</p>
      </footer>
    </div>
  );
}
