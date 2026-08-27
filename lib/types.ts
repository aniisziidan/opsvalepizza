export type AppView = 
  | 'home' 
  | 'calculator' 
  | 'quote-request' 
  | 'products' 
  | 'how-it-works' 
  | 'about'
  | 'admin-dashboard'
  | 'admin-leads'
  | 'admin-lead-detail'
  | 'admin-crm'
  | 'admin-quotes'
  | 'admin-pricing'
  | 'admin-logistics'
  | 'admin-settings';

export type LeadStatus =
  | 'NEW'
  | 'REVIEWING'
  | 'NEED_MORE_INFO'
  | 'QUOTE_PREPARED'
  | 'QUOTE_SENT'
  | 'NEGOTIATING'
  | 'WON'
  | 'LOST';

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  REVIEWING: 'Reviewing',
  NEED_MORE_INFO: 'Need More Info',
  QUOTE_PREPARED: 'Quote Prepared',
  QUOTE_SENT: 'Quote Sent',
  NEGOTIATING: 'Negotiating',
  WON: 'Closed Won',
  LOST: 'Closed Lost',
};

export const LEAD_STATUS_STYLE: Record<LeadStatus, string> = {
  NEW: 'bg-[#ffdeac] text-[#735a31]',
  REVIEWING: 'bg-[#dce9ff] text-[#041632]',
  NEED_MORE_INFO: 'bg-amber-100 text-amber-800',
  QUOTE_PREPARED: 'bg-violet-100 text-violet-800',
  QUOTE_SENT: 'bg-sky-100 text-sky-800',
  NEGOTIATING: 'bg-[#eff4ff] text-[#041632]',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-red-100 text-red-800',
};

export interface CalculatorState {
  country: string;
  boxSize: '28cm' | '32cm' | '40cm';
  material: 'kraft' | 'white';
  print: 'plain' | 'custom';
  boxesPerOrder: number;
  monthlyVolume: number;
  currentPrice: number;
}
