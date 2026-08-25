import { Lead, ActivityItem } from '@/lib/types';

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    code: 'LD-8492',
    companyName: 'Pizza Planet EU',
    contactName: 'Marco Rossi',
    jobTitle: 'Procurement Director',
    email: 'm.rossi@pizzaplanet.eu',
    phone: '+39 02 1234 5678',
    location: 'Milan, Italy (HQ)',
    branches: '21-50',
    website: 'https://pizzaplanet.eu',
    status: 'Reviewing',
    createdAt: 'Oct 12, 2024, 09:15 AM',
    calculatorData: {
      primaryBoxSize: '32cm (13")',
      monthlyVolume: 150000,
      boxesPerOrder: 15000,
      currentPrice: 0.35,
      estimatedSavingsYearly: 12400,
      deliveryCountry: 'Germany, Italy, France',
      currentSupplierType: 'Local Distributor',
      materialPreference: 'Kraft Brown, Uncoated',
      printType: 'Custom Printed (2 colors)',
    },
    quoteDetails: {
      submittedAt: 'Oct 12, 2024',
      customerNotes: 'We are looking to transition our entire EU operations to a single supplier for our standard 32cm and 26cm pizza boxes. We need custom printing (2 colors) on the lid. Please provide pricing for quarterly deliveries to our central hubs in Munich and Milan.',
      uploadedFiles: [
        { name: 'logo_artwork_v2.ai', size: '2.4 MB', type: 'ai' },
        { name: 'current_specs.pdf', size: '1.1 MB', type: 'pdf' }
      ]
    },
    activityHistory: [
      {
        id: 'act-1',
        timestamp: 'Today, 10:45 AM',
        author: 'Sarah Jenkins',
        type: 'status_change',
        content: 'changed status to Reviewing'
      },
      {
        id: 'act-2',
        timestamp: 'Yesterday, 14:20 PM',
        author: 'Admin System',
        type: 'note',
        content: 'Lead verified via ZoomInfo. High potential account. Assigned to EU Sales Team.'
      },
      {
        id: 'act-3',
        timestamp: 'Oct 12, 2024, 09:15 AM',
        author: 'System',
        type: 'created',
        content: 'Lead created via Savings Calculator form'
      }
    ]
  },
  {
    id: 'lead-2',
    code: 'LD-8493',
    companyName: 'Acme Corp Logistics',
    contactName: 'Sarah Jenkins',
    jobTitle: 'Supply Chain Lead',
    email: 's.jenkins@acmecorp.com',
    phone: '+44 20 7946 0192',
    location: 'London, UK',
    branches: '50+',
    website: 'https://acmepizza.co.uk',
    status: 'New',
    createdAt: 'Just now',
    calculatorData: {
      primaryBoxSize: '28cm (11")',
      monthlyVolume: 80000,
      boxesPerOrder: 10000,
      currentPrice: 0.38,
      estimatedSavingsYearly: 8600,
      deliveryCountry: 'United Kingdom',
      currentSupplierType: 'Regional Broker',
      materialPreference: 'White Bleached',
      printType: 'Custom Printed (3 colors)',
    },
    quoteDetails: {
      submittedAt: 'Today',
      customerNotes: 'Urgent need for Q4 volume surge. Please quote pallet deliveries to 3 UK regional depots.',
      uploadedFiles: [
        { name: 'acme_brand_guidelines.pdf', size: '3.8 MB', type: 'pdf' }
      ]
    },
    activityHistory: [
      {
        id: 'act-4',
        timestamp: 'Just now',
        author: 'Sarah Jenkins',
        type: 'created',
        content: 'Submitted new quote request #Q-4921'
      }
    ]
  },
  {
    id: 'lead-3',
    code: 'LD-8488',
    companyName: 'Global Freightways',
    contactName: 'Mike R.',
    jobTitle: 'VP Procurement',
    email: 'miker@freightways.de',
    phone: '+49 30 555 3829',
    location: 'Berlin, Germany',
    branches: '6-20',
    website: 'https://freightways.de',
    status: 'Negotiation',
    createdAt: '3 days ago',
    calculatorData: {
      primaryBoxSize: '32cm (13")',
      monthlyVolume: 220000,
      boxesPerOrder: 25000,
      currentPrice: 0.32,
      estimatedSavingsYearly: 18900,
      deliveryCountry: 'Germany',
      currentSupplierType: 'Direct Manufacturer',
      materialPreference: 'Kraft Brown',
      printType: 'Custom Printed (1 color)',
    },
    quoteDetails: {
      submittedAt: 'Nov 14, 2024',
      customerNotes: 'Negotiating payment terms (Net 60) for semi-annual contract.',
      uploadedFiles: []
    },
    activityHistory: [
      {
        id: 'act-5',
        timestamp: '45 mins ago',
        author: 'Mike R.',
        type: 'status_change',
        content: 'Status changed to Negotiation'
      }
    ]
  },
  {
    id: 'lead-4',
    code: 'LD-8475',
    companyName: 'TechPack Solutions',
    contactName: 'Elena Rostova',
    jobTitle: 'Operations Director',
    email: 'elena@techpack.fr',
    phone: '+33 1 42 68 55 00',
    location: 'Paris, France',
    branches: '50+',
    website: 'https://techpack.fr',
    status: 'Closed Won',
    createdAt: '1 week ago',
    calculatorData: {
      primaryBoxSize: '40cm (16")',
      monthlyVolume: 350000,
      boxesPerOrder: 40000,
      currentPrice: 0.42,
      estimatedSavingsYearly: 32500,
      deliveryCountry: 'France, Belgium',
      currentSupplierType: 'National Wholesaler',
      materialPreference: 'Kraft Brown',
      printType: 'Custom Printed (2 colors)',
    },
    quoteDetails: {
      submittedAt: 'Nov 02, 2024',
      customerNotes: 'Contract finalized and signed. Initial delivery batch scheduled for Dec 1st.',
      uploadedFiles: [
        { name: 'contract_signed_vFinal.pdf', size: '4.2 MB', type: 'pdf' }
      ]
    },
    activityHistory: [
      {
        id: 'act-6',
        timestamp: '2 hours ago',
        author: 'Sales Admin',
        type: 'status_change',
        content: 'Opportunity TechPack Solutions was marked as Closed Won. Finalized the SLA terms. Contract signed.'
      }
    ]
  },
  {
    id: 'lead-5',
    code: 'LD-8460',
    companyName: 'EastCoast Supply Chain',
    contactName: 'Antonio Silva',
    jobTitle: 'Head of Purchasing',
    email: 'antonio.silva@eastcoastsupply.es',
    phone: '+34 91 123 4567',
    location: 'Madrid, Spain',
    branches: '6-20',
    website: 'https://eastcoastsupply.es',
    status: 'Reviewing',
    createdAt: 'Yesterday, 14:30',
    calculatorData: {
      primaryBoxSize: '32cm (13")',
      monthlyVolume: 95000,
      boxesPerOrder: 12000,
      currentPrice: 0.36,
      estimatedSavingsYearly: 9800,
      deliveryCountry: 'Spain',
      currentSupplierType: 'Regional Distributor',
      materialPreference: 'Kraft Brown',
      printType: 'Plain (No Print)',
    },
    quoteDetails: {
      submittedAt: 'Yesterday, 14:30',
      customerNotes: 'Evaluating direct factory pricing to replace existing Spanish local supplier.',
      uploadedFiles: []
    },
    activityHistory: [
      {
        id: 'act-7',
        timestamp: 'Yesterday, 14:30',
        author: 'System',
        type: 'status_change',
        content: 'New Lead assigned: EastCoast Supply Chain.'
      }
    ]
  }
];

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    timeAgo: 'Just now',
    author: 'Sarah Jenkins',
    subject: 'submitted a new quote for',
    company: 'Acme Corp Logistics',
    action: 'submitted',
    tag: 'Quote #Q-4921',
    type: 'quote'
  },
  {
    id: 'act-2',
    timeAgo: '45 mins ago',
    author: 'Mike R.',
    subject: 'Status changed to',
    company: 'Global Freightways',
    action: 'Negotiation',
    type: 'status'
  },
  {
    id: 'act-3',
    timeAgo: '2 hours ago',
    author: 'Sales Admin',
    subject: 'Opportunity was marked as',
    company: 'TechPack Solutions',
    action: 'Closed Won',
    noteSnippet: 'Finalized the SLA terms. Contract signed.',
    type: 'won'
  },
  {
    id: 'act-4',
    timeAgo: 'Yesterday, 14:30',
    author: 'System',
    subject: 'New Lead assigned:',
    company: 'EastCoast Supply Chain',
    action: 'assigned',
    type: 'assigned'
  },
  {
    id: 'act-5',
    timeAgo: 'Yesterday, 10:15',
    author: 'Automation Bot',
    subject: 'Automated follow-up sent to 12 stagnant leads in',
    company: 'Region B (Central Europe)',
    action: 'sent',
    type: 'system'
  }
];

export const PRODUCT_CATALOG = [
  {
    id: 'p-28',
    title: 'Standard 28cm (11")',
    desc: 'The European standard for individual Neapolitan & classic stone-baked pizzas.',
    caliper: 'E-Flute Micro-corrugated',
    weight: '340 GSM Heavyweight',
    moq: '1,000 units',
    unitPrice: '€0.19 - €0.24',
    features: ['Fold-and-lock vented tabs', '100% Recyclable & Biodegradable', 'Certified Food Contact Safe EN 646']
  },
  {
    id: 'p-32',
    title: 'Standard 32cm (13")',
    badge: 'Most Popular',
    desc: 'High-volume workhorse for European delivery chains and pizzeria franchises.',
    caliper: 'B-Flute High-stack rigidity',
    weight: '380 GSM Heavyweight Kraft',
    moq: '1,000 units',
    unitPrice: '€0.21 - €0.26',
    features: ['Dual steam release micro-vents', 'Corner crush resistance > 450N', 'Available in Natural Kraft or Pure White']
  },
  {
    id: 'p-40',
    title: 'Party / Family 40cm (16")',
    desc: 'Extra structural rigidity engineered to eliminate sagging on large format pizzas.',
    caliper: 'B/C Double Flute option',
    weight: '440 GSM Reinforced',
    moq: '1,000 units',
    unitPrice: '€0.29 - €0.35',
    features: ['Reinforced front lip', 'Heat retention insulated lining', 'Heavy stack stacking integrity']
  },
  {
    id: 'p-calzone',
    title: 'Calzone & Wedge Boxes',
    desc: 'Specialty angled boxes designed for calzones, garlic bread, and specialty slices.',
    caliper: 'E-Flute Compact',
    weight: '320 GSM',
    moq: '1,500 units',
    unitPrice: '€0.16 - €0.21',
    features: ['Easy-open tear strip', 'Grease-resistant inner coating', 'Stack-friendly footprint']
  }
];
