'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const callbackUrl =
      new URLSearchParams(window.location.search).get('callbackUrl') ??
      '/admin/dashboard';

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      setLoading(false);
      if (!res?.ok) {
        setError('Invalid email or password.');
        return;
      }
      // On success, navigate to the original callback or the dashboard.
      window.location.href = callbackUrl;
    } catch {
      setLoading(false);
      setError('Invalid email or password.');
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex items-center justify-center px-4 selection:bg-[#ffdeac] selection:text-[#281900]">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-[#e77114] rounded flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-2xl">package</span>
          </div>
          <div className="leading-tight">
            <span className="font-headline font-bold text-2xl text-[#041632] block">
              OpsVale
            </span>
            <span className="font-mono-data text-[10px] text-[#4f5e7e] uppercase tracking-wider block">
              Operations Portal
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg border border-[#c5c6ce] shadow-sm p-8">
          <h1 className="font-headline font-bold text-xl text-[#041632] mb-1">
            Sign in
          </h1>
          <p className="font-body text-sm text-[#4f5e7e] mb-6">
            Restricted access. Authorised operators only.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="font-mono-data text-[11px] uppercase tracking-wider text-[#4f5e7e] mb-1.5 block"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-lg border border-[#c5c6ce] bg-[#f8f9ff] text-[#0b1c30] font-body text-sm outline-none focus:border-[#041632] focus:ring-2 focus:ring-[#041632]/10 transition"
                placeholder="admin@opsvale.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="font-mono-data text-[11px] uppercase tracking-wider text-[#4f5e7e] mb-1.5 block"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-lg border border-[#c5c6ce] bg-[#f8f9ff] text-[#0b1c30] font-body text-sm outline-none focus:border-[#041632] focus:ring-2 focus:ring-[#041632]/10 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="font-mono-data text-[12px] text-[#b3261e] bg-[#fdecea] border border-[#f5c6c1] rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] bg-[#041632] hover:bg-[#0b264d] disabled:opacity-60 text-white rounded-lg font-mono-data text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="font-mono-data text-[10px] text-[#8393b5] text-center mt-6 uppercase tracking-wider">
          OpsVale · Operations Portal
        </p>
      </div>
    </div>
  );
}
