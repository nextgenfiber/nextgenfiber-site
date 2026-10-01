import { jobsites, extraStates } from './jobsites';
// Single source of truth for company facts.
// Every figure here must have a source. Anything without one stays `null`
// and is not rendered. See SOURCES.md for where each number comes from.

export const company = {
  name: 'NextGen Fiber',
  legalName: 'NextGen Fiber LLC',
  founded: 2023,
  phone: '551-274-9008',
  phoneHref: 'tel:+15512749008',
  email: 'ngf@nextgenfiberllc.com',
  address: {
    street: '1719 N Central St',
    city: 'Knoxville',
    region: 'TN',
    postal: '37917',
    country: 'US',
  },
  // Knoxville office, used for the "hub" annotation in diagrams.
  coords: { lat: '35.98° N', lng: '83.92° W' },
  linkedin: 'https://www.linkedin.com/company/nextgen-fiber',
  formEndpoint: 'https://formspree.io/f/mreaqlne',
};

export const addressLine = `${company.address.street}, ${company.address.city}, ${company.address.region} ${company.address.postal}`;

// Company-wide footage across all prime contractors, confirmed by the owner
// on 2026-10-01. The ledger figures below cover one prime contractor only.
export const stats = [
  { value: 15, suffix: 'M+', unit: 'ft', label: 'Fiber, strand and overlash placed', source: 'Company-wide, all prime contractors, 2023–2026 (owner-reported)' },
  { value: jobsites.length, suffix: '', unit: '', label: 'Markets worked', source: 'Job sites on the Projects map' },
  { value: 0, suffix: '', unit: '', label: 'States', source: 'Job sites on the Projects map' },
  { value: 2023, suffix: '', unit: '', label: 'Building fiber since', source: 'Form 1065 2024, date business started' },
];

// One prime contractor's invoice ledger, Apr 2023 – Jul 2026. Line items
// measure overlapping spans, so they are never added together.
export const ledgerStats = [
  { value: 2.3, suffix: 'M+', unit: 'ft', label: 'Fiber lashed to strand', source: 'Single prime contractor invoice ledger, lash line items' },
  { value: 1.7, suffix: 'M+', unit: 'ft', label: 'New aerial plant built', source: 'Single prime contractor invoice ledger, new aerial construction' },
  { value: 1.0, suffix: 'M+', unit: 'ft', label: 'Overlash completed', source: 'Single prime contractor invoice ledger, overlash line items' },
];

// Every state worked, ordered by number of job sites.
export const states: string[] = [...new Set([...Object.entries(Object.groupBy(jobsites, (j) => j.stateName)).sort((a, b) => (b[1]?.length ?? 0) - (a[1]?.length ?? 0)).map(([s]) => s), ...extraStates])];

// Markets by state, derived from the evidence-backed job site list that also
// drives the Projects map (src/data/jobsites.ts).
export const markets = Object.entries(Object.groupBy(jobsites, (j) => j.state))
  .map(([state, list]) => ({ state, places: (list ?? []).map((j) => j.name) }))
  .sort((a, b) => b.places.length - a.places.length);

// Pending written approval. Leave `logo: null` until a signed OK exists.
export const clients: { name: string; logo: string | null; approved: boolean }[] = [];

// Safety metrics: fill only from documents (OSHA 300A, carrier EMR letter).
export const safetyMetrics: { label: string; value: string }[] = [];

export const nav = [
  { href: '/services', label: 'Services' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/culture', label: 'Culture' },
  { href: '/contact', label: 'Contact' },
];

// The state count stat is filled from the job site data.
stats[2].value = states.length;
