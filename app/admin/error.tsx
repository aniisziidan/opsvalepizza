'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled admin workspace error:', error.digest || error.message);
  }, [error]);

  return (
    <div className="p-8 max-w-lg mx-auto my-12 bg-white border border-[#c5c6ce] rounded-xl shadow-sm space-y-6 text-center">
      <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
        <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
      </div>

      <div className="space-y-2">
        <h2 className="font-headline text-xl font-bold text-[#041632]">
          Admin Operation Error
        </h2>
        <p className="font-body text-xs text-[#44474d] leading-relaxed">
          The requested administrative operation could not be completed. Your session remains secure.
        </p>
      </div>

      {error.digest && (
        <div className="bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2 font-mono-data text-[11px] text-[#75777e]">
          Error Reference: <strong className="text-[#041632]">{error.digest}</strong>
        </div>
      )}

      <div className="flex gap-3 justify-center font-mono-data text-xs">
        <button
          onClick={() => reset()}
          className="bg-[#041632] hover:bg-[#1b2b48] text-white px-5 py-2.5 rounded-lg uppercase font-bold tracking-wider cursor-pointer transition-colors"
        >
          Retry Action
        </button>

        <Link
          href="/admin/dashboard"
          className="bg-[#eff4ff] hover:bg-[#dce9ff] text-[#041632] border border-[#c5c6ce] px-5 py-2.5 rounded-lg uppercase font-bold tracking-wider transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
