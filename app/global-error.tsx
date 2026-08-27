'use client';

import React from 'react';

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-[#c5c6ce] rounded-xl p-8 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>

          <h2 className="text-xl font-bold text-[#041632]">System Error</h2>
          <p className="text-xs text-[#44474d] leading-relaxed">
            An unexpected error occurred. Please refresh or retry the operation.
          </p>

          {error.digest && (
            <p className="text-[10px] font-mono text-[#75777e] bg-[#f8f9ff] p-2 rounded border border-[#e2e4ef]">
              Reference: {error.digest}
            </p>
          )}

          <button
            onClick={() => reset()}
            className="w-full bg-[#041632] text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#1b2b48] cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
