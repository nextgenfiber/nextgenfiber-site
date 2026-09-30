export type Service = {
  slug: string;
  index: string;
  name: string;
  short: string;
  lead: string;
  scope: string[];
  deliverables: string[];
  equipment?: string[];
  photo?: { src: string; w: number; h: number; alt: string; caption: string };
};

export const services: Service[] = [
  {
    slug: 'aerial-construction',
    index: '01',
    name: 'Aerial Construction',
    short: 'Strand, lash and overlash on joint-use poles, built to print and ready for inspection.',
    lead: 'Most of our footage is aerial. Our crews place strand, lash new fiber and overlash existing plant on FTTH, feeder and distribution builds across the Southeast.',
    scope: ['Strand placement and tensioning', 'New fiber lash and overlash', 'Anchors, down guys and bonding', 'Pole transfers and make-ready support', 'Riser and slack loop installation', 'Storm and damage repair'],
    deliverables: ['GPS-stamped photos per pole', 'Redlines and as-builts', 'Daily production report'],
    photo: { src: '/img/photos/closeout-photo-sample.webp', w: 1280, h: 960, alt: 'Closeout photo of aerial plant with time, date and map code overlay; address and GPS blurred', caption: 'Actual closeout photo. Address, coordinates and technician blurred.' },
  },
  {
    slug: 'underground-hdd',
    index: '02',
    name: 'Underground & HDD',
    short: 'Directional boring, conduit and handhole work with full restoration.',
    lead: 'We run our own directional drill and missile crews for conduit placement under roads, driveways and yards, then restore the site before we leave.',
    scope: ['Horizontal directional drilling', 'Missile boring for short crossings', 'Conduit and innerduct placement', 'Handhole and vault setting', 'Locate coordination', 'Full restoration and cleanup'],
    deliverables: ['Bore logs and depth records', 'Restoration photos', 'Redlines and as-builts'],
    equipment: ['Vermeer D20x22 Series III directional drill'],
  },
  {
    slug: 'fiber-pulling',
    index: '03',
    name: 'Fiber Pulling',
    short: 'Cable placement in duct and on messenger, with slack and tension managed end to end.',
    lead: 'We place fiber in duct and on messenger for feeder, distribution and drop networks, keeping bend radius, tension and slack to spec.',
    scope: ['Pull in conduit and innerduct', 'Placement on messenger', 'Slack storage and coils', 'Tagging and labeling', 'Handhole and pole-line routing'],
    deliverables: ['Footage by span', 'Tag and slack records', 'Photos at every access point'],
  },
  {
    slug: 'splicing-testing',
    index: '04',
    name: 'Splicing & Testing',
    short: 'Fusion splicing, enclosure assembly and OTDR test results your client can sign off on.',
    lead: 'Our splicers build enclosures, terminals and jumpers in the bucket and on the ground, and hand over test results with every closeout.',
    scope: ['Fusion splicing and enclosure assembly', 'Terminals, taps and jumpers', 'OTDR and power meter testing', 'Troubleshooting and repair', 'Emergency restoration splicing'],
    deliverables: ['OTDR traces per fiber', 'Splice and port maps', 'Enclosure photos, open and closed'],
    photo: { src: '/img/photos/splice-enclosure-closeup.webp', w: 711, h: 626, alt: 'Aerial fiber splice enclosure on strand, photographed from the bucket truck', caption: 'Falkville, AL · Aerial splice enclosure · Apr 2026' },
  },
  {
    slug: 'storm-restoration',
    index: '05',
    name: 'Storm & Restoration',
    short: 'Crews that mobilize fast when plant comes down, and document every repair.',
    lead: 'When weather takes down poles and cable, we mobilize crews to replace strand, re-lash, re-splice and restore service, with photo documentation at every location.',
    scope: ['Downed strand and cable replacement', 'Jumpers and temporary restoration', 'Re-splicing and testing', 'Location-by-location damage reports'],
    deliverables: ['Before and after photos by location', 'Repair log per address', 'Test results after restoration'],
  },
];
