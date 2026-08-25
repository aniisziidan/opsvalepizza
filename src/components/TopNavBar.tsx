import React from 'react';
import { AppView } from '../types';

interface TopNavBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenQuote: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ currentView, onNavigate, onOpenQuote }) => {
  const [lang, setLang] = React.useState<'EN' | 'DE' | 'IT' | 'FR' | 'ES'>('EN');
  const [langDropdownOpen, setLangDropdownOpen] = React.useState(false);

  const navItems: { label: string; view: AppView }[] = [
    { label: 'Home', view: 'home' },
    { label: 'Products', view: 'products' },
    { label: 'How It Works', view: 'how-it-works' },
    { label: 'Savings Calculator', view: 'calculator' },
    { label: 'About', view: 'about' },
  ];

  return (
    <nav className="bg-[#f8f9ff] text-[#041632] sticky top-0 border-b border-[#c5c6ce] z-50 transition-colors">
      <div className="flex justify-between items-center w-full px-4 sm:px-8 md:px-16 max-w-[1440px] mx-auto h-20">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onNavigate('home')}
            className="font-headline text-2xl sm:text-3xl font-bold text-[#041632] flex items-center gap-2 hover:opacity-90 transition-opacity text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-3xl text-[#e77114]">package</span>
            OpsVale
          </button>
        </div>

        {/* Navigation Links (Desktop) */}
        <ul className="hidden md:flex items-center gap-6 lg:gap-8 font-mono-data text-xs tracking-wider">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <li key={item.view}>
                <button
                  onClick={() => onNavigate(item.view)}
                  className={`cursor-pointer transition-all duration-200 py-1.5 px-2.5 rounded text-xs ${
                    isActive
                      ? 'text-[#041632] font-bold border-b-2 border-[#041632] opacity-100'
                      : 'text-[#44474d] hover:text-[#041632] hover:bg-[#eff4ff]'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Trailing Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Admin Switcher Badge for easy access to Ops portal */}
          <button
            onClick={() => onNavigate('admin-dashboard')}
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#1b2b48] text-[#d7e2ff] hover:bg-[#041632] px-3 py-2 rounded text-xs font-mono-data transition-colors cursor-pointer border border-[#8393b5]/30"
            title="Switch to Internal Operations Portal"
          >
            <span className="material-symbols-outlined text-[16px] text-[#e3c290]">shield_person</span>
            <span>Ops Portal</span>
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="text-[#44474d] hover:text-[#041632] transition-colors flex items-center gap-1 p-2 rounded hover:bg-[#eff4ff] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">language</span>
              <span className="font-mono-data text-xs uppercase hidden lg:block">{lang}</span>
            </button>
            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-28 bg-white border border-[#c5c6ce] rounded shadow-lg py-1 z-50 font-mono-data text-xs">
                {(['EN', 'DE', 'IT', 'FR', 'ES'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLang(l);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#eff4ff] ${
                      lang === l ? 'font-bold text-[#e77114]' : 'text-[#44474d]'
                    }`}
                  >
                    {l} - {l === 'EN' ? 'English' : l === 'DE' ? 'Deutsch' : l === 'IT' ? 'Italiano' : l === 'FR' ? 'Français' : 'Español'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary CTA */}
          <button
            onClick={onOpenQuote}
            className="bg-[#e77114] text-white px-5 sm:px-6 py-2.5 sm:py-3 font-mono-data text-xs uppercase tracking-wider hover:bg-[#c25e10] transition-colors shadow-[0px_4px_20px_rgba(27,43,72,0.08)] cursor-pointer font-semibold rounded-sm"
          >
            Request a Quote
          </button>
        </div>
      </div>

      {/* Mobile nav bar row */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-t border-[#c5c6ce]/50 bg-[#eff4ff]/60 overflow-x-auto gap-2 font-mono-data text-xs">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`whitespace-nowrap px-2.5 py-1 rounded text-[11px] ${
              currentView === item.view
                ? 'bg-[#041632] text-white font-bold'
                : 'text-[#44474d] hover:text-[#041632]'
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="whitespace-nowrap px-2.5 py-1 rounded text-[11px] bg-[#1b2b48] text-[#e3c290] font-bold"
        >
          Ops Portal
        </button>
      </div>
    </nav>
  );
};
