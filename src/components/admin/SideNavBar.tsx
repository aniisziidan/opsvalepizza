import React from 'react';
import { AppView } from '../../types';

interface SideNavBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onNewQuoteClick: () => void;
  newLeadsCount: number;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentView,
  onNavigate,
  onNewQuoteClick,
  newLeadsCount,
}) => {
  const menuItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: 'dashboard', view: 'admin-dashboard' as AppView },
    { id: 'admin-leads', label: 'Leads', icon: 'group', badge: newLeadsCount > 0 ? `${newLeadsCount}` : undefined, view: 'admin-leads' as AppView },
    { id: 'admin-crm', label: 'CRM Contacts', icon: 'contacts_product', view: 'admin-crm' as AppView },
    { id: 'admin-quotes', label: 'Quotes', icon: 'request_quote', badge: '3', view: 'admin-quotes' as AppView },
    { id: 'admin-pricing', label: 'Pricing Engine', icon: 'monetization_on', view: 'admin-pricing' as AppView },
    { id: 'admin-logistics', label: 'Logistics Hubs', icon: 'local_shipping', view: 'admin-logistics' as AppView },
    { id: 'admin-settings', label: 'Settings', icon: 'settings', view: 'admin-settings' as AppView },
  ];

  return (
    <aside className="w-64 bg-[#041632] text-white flex-shrink-0 border-r border-[#1b2b48] flex flex-col justify-between h-screen sticky top-0 z-40 overflow-y-auto">
      {/* Top Section */}
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#1b2b48] flex items-center justify-between">
          <button
            onClick={() => onNavigate('admin-dashboard')}
            className="flex items-center gap-3 cursor-pointer text-left"
          >
            <div className="w-9 h-9 bg-[#e77114] rounded flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">package</span>
            </div>
            <div>
              <span className="font-headline font-bold text-lg text-white block">OpsVale</span>
              <span className="font-mono-data text-[10px] text-[#8393b5] uppercase tracking-wider block">
                Ops Admin Portal
              </span>
            </div>
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-4 bg-[#1b2b48] rounded-lg border border-[#4f5e7e]/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e3c290] text-[#041632] font-headline font-bold flex items-center justify-center text-sm shadow-inner flex-shrink-0">
            SJ
          </div>
          <div className="overflow-hidden">
            <h4 className="font-body text-sm font-semibold text-white truncate">Sarah Jenkins</h4>
            <p className="font-mono-data text-[11px] text-[#8393b5] truncate">Procurement Admin</p>
          </div>
        </div>

        {/* New Quote Quick Action */}
        <div className="px-4 mb-4">
          <button
            onClick={onNewQuoteClick}
            className="w-full bg-[#e77114] hover:bg-[#c25e10] text-white py-2.5 px-4 rounded-lg font-mono-data text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer font-bold shadow-md"
          >
            <span className="material-symbols-outlined text-base">add</span>
            + New Quote
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1 font-mono-data text-xs">
          {menuItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.view)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#1b2b48] text-white font-bold border-l-4 border-[#e77114]'
                    : 'text-[#8393b5] hover:bg-[#1b2b48]/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-lg ${isActive ? 'text-[#e3c290]' : 'text-[#8393b5]'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-[#e77114] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-[#1b2b48] space-y-2 font-mono-data text-xs">
        {/* Switch back to Customer Portal */}
        <button
          onClick={() => onNavigate('home')}
          className="w-full flex items-center gap-3 px-3 py-2 text-[#e3c290] hover:bg-[#1b2b48] rounded-lg transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">storefront</span>
          <span>View Customer Site</span>
        </button>

        <button
          onClick={() => alert('OpsVale Support Desk: support@opsvale.eu | Priority Phone: +31 10 998 012')}
          className="w-full flex items-center gap-3 px-3 py-2 text-[#8393b5] hover:text-white hover:bg-[#1b2b48] rounded-lg transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">help_outline</span>
          <span>Support</span>
        </button>
      </div>
    </aside>
  );
};
