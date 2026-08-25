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

export type LeadStatus = 'New' | 'Reviewing' | 'Quoted' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

export interface Lead {
  id: string;
  code: string;
  companyName: string;
  contactName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  branches: string;
  website: string;
  status: LeadStatus;
  createdAt: string;
  calculatorData: {
    primaryBoxSize: string;
    monthlyVolume: number;
    boxesPerOrder: number;
    currentPrice: number;
    estimatedSavingsYearly: number;
    deliveryCountry: string;
    materialPreference: string;
    printType: string;
    currentSupplierType?: string;
  };
  quoteDetails?: {
    submittedAt: string;
    customerNotes: string;
    uploadedFiles: Array<{ name: string; size: string; type: string }>;
  };
  activityHistory: Array<{
    id: string;
    timestamp: string;
    author: string;
    type: 'status_change' | 'note' | 'created' | 'email' | 'system';
    content: string;
    highlight?: boolean;
  }>;
}

export interface ActivityItem {
  id: string;
  timeAgo: string;
  author: string;
  subject: string;
  company: string;
  action: string;
  tag?: string;
  noteSnippet?: string;
  type: 'quote' | 'status' | 'won' | 'assigned' | 'system';
}

export interface CalculatorState {
  country: string;
  boxSize: '28cm' | '32cm' | '40cm';
  material: 'kraft' | 'white';
  print: 'plain' | 'custom';
  boxesPerOrder: number;
  monthlyVolume: number;
  currentPrice: number;
}
