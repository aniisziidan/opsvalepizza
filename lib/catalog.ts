/**
 * Marketing catalog product specifications.
 */

export interface ProductCatalogItem {
  id: string;
  title: string;
  badge?: string;
  desc: string;
  caliper: string;
  weight: string;
  moq: string;
  unitPrice: string;
  features: string[];
}

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  {
    id: 'p-28',
    title: 'Standard 28cm (11")',
    desc: 'The European standard for individual Neapolitan & classic stone-baked pizzas.',
    caliper: 'E-Flute Micro-corrugated',
    weight: '340 GSM Heavyweight',
    moq: '1,000 units',
    unitPrice: '€0.19 - €0.24',
    features: [
      'Fold-and-lock vented tabs',
      '100% Recyclable & Biodegradable',
      'Certified Food Contact Safe EN 646',
    ],
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
    features: [
      'Dual steam release micro-vents',
      'Corner crush resistance > 450N',
      'Available in Natural Kraft or Pure White',
    ],
  },
  {
    id: 'p-40',
    title: 'Party / Family 40cm (16")',
    desc: 'Extra structural rigidity engineered to eliminate sagging on large format pizzas.',
    caliper: 'B/C Double Flute option',
    weight: '440 GSM Reinforced',
    moq: '1,000 units',
    unitPrice: '€0.29 - €0.35',
    features: [
      'Reinforced front lip',
      'Heat retention insulated lining',
      'Heavy stack stacking integrity',
    ],
  },
  {
    id: 'p-calzone',
    title: 'Calzone & Wedge Boxes',
    desc: 'Specialty angled boxes designed for calzones, garlic bread, and specialty slices.',
    caliper: 'E-Flute Compact',
    weight: '320 GSM',
    moq: '1,500 units',
    unitPrice: '€0.16 - €0.21',
    features: [
      'Easy-open tear strip',
      'Grease-resistant inner coating',
      'Stack-friendly footprint',
    ],
  },
];
