// Mock data for Ras Ali
export const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Services', href: '/services' },
  { name: 'Work', href: '/work' },
  { name: 'Booking', href: '/booking' },
];

export const heroWords = ['BASSIST.', 'ENGINEER.', 'VISUALS.', 'DEVELOPER.'];

// SVG Logo Data URI for "Artist Portfolio"
const logoImage = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6IzBhMGEwYSI+CiAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNDAwIDMwMCkgc2NhbGUoNSkiPgogICAgPCEtLSBEb3RzIC0tPgogICAgPGNpcmNsZSBjeD0iLTI1IiBjeT0iLTMwIiByPSI4IiBmaWxsPSIjYTNlNjM1Ii8+CiAgICA8Y2lyY2xlIGN4PSIwIiBjeT0iLTMwIiByPSI4IiBmaWxsPSIjYTNlNjM1Ii8+CiAgICA8Y2lyY2xlIGN4PSIyNSIgY3k9Ii0zMCIgcj0iOCIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMyIvPgogICAgPCEtLSBUZXh0IC0tPgogICAgPHRleHQgeD0iMCIgeT0iMjAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIycHgiPlJBUyBBTEk8L3RleHQ+CiAgPC9nPgo8L3N2Zz4=`;

export const featuredProjects = [
  {
    id: 1,
    title: 'Live at Jazz Festival',
    subtitle: 'Bass Performance',
    image: '/assets/images/ras-ali-bass-1.jpg',
    category: 'Music'
  },
  {
    id: 2,
    title: 'Studio Sessions Vol. 1',
    subtitle: 'Sound Engineering & Mixing',
    image: 'https://picsum.photos/seed/studio/800/600',
    category: 'Audio'
  },
  {
    id: 3,
    title: 'Urban Rhythm',
    subtitle: 'Music Video Directed & Edited',
    image: 'https://picsum.photos/seed/video/800/600',
    category: 'Video'
  },
  {
    id: 4,
    title: 'Artist Portfolio',
    subtitle: 'Web Development',
    image: logoImage, // Using SVG Logo as requested
    category: 'Web'
  },
  {
    id: 5,
    title: 'Podcast Series',
    subtitle: 'Audio Editing & Production',
    image: 'https://picsum.photos/seed/podcast/800/600',
    category: 'Audio'
  },
  {
    id: 6,
    title: 'Event Highlights',
    subtitle: 'Videography & Post-Production',
    image: '/assets/images/ras-ali-bass-3.png',
    category: 'Video'
  },
  {
    id: 7,
    title: 'Eagle Touch Tours',
    subtitle: 'Tourism Website',
    image: 'https://picsum.photos/seed/eagle/800/600',
    category: 'Web',
    link: 'https://www.eagletouchtours.com'
  },
  {
    id: 8,
    title: 'Peregrine Tours',
    subtitle: 'Safari & Travel Website',
    image: 'https://picsum.photos/seed/peregrine/800/600',
    category: 'Web',
    link: 'https://www.peregrinetoursandsafaris.com'
  },
  {
    id: 9,
    title: 'The Safari Butler',
    subtitle: 'Luxury Travel Website',
    image: 'https://picsum.photos/seed/safari/800/600',
    category: 'Web',
    link: 'https://www.thesafaributler.com'
  },
  {
    id: 10,
    title: 'Pameltex',
    subtitle: 'Corporate Website',
    image: 'https://picsum.photos/seed/pameltex/800/600',
    category: 'Web',
    link: 'https://www.pameltex.com'
  },
  {
    id: 11,
    title: 'Lebville Boutique',
    subtitle: 'E-commerce Website',
    image: 'https://picsum.photos/seed/lebville/800/600',
    category: 'Web',
    link: 'https://www.lebvilleboutique.com'
  },
  {
    id: 12,
    title: 'BB Travel Tours',
    subtitle: 'Travel Agency Website',
    image: 'https://picsum.photos/seed/bbtravel/800/600',
    category: 'Web',
    link: 'https://www.bbtraveltours.com'
  },
  {
    id: 13,
    title: 'The Melody Gospel',
    subtitle: 'TV Show Production',
    image: 'https://picsum.photos/seed/gospel/800/600',
    category: 'TV Production',
    roles: ['Music Director', 'Composer', 'Sound Engineer', 'Intro Composer', 'Show Director']
  },
  {
    id: 14,
    title: 'Pula Pitch',
    subtitle: 'Business Reality TV Show',
    image: 'https://picsum.photos/seed/pula/800/600',
    category: 'TV Production',
    roles: ['Videographer Main Camera', 'Props Set up', 'Pre and Post Production']
  },
  {
    id: 15,
    title: 'Dedications',
    subtitle: 'Music Request Show',
    image: '/assets/images/ras-ali-bass-2.png',
    category: 'TV Production',
    roles: ['Bassist', 'Artist Liaison', 'Arrangements & Composition']
  }
];

export const services = [
  {
    id: 1,
    title: 'Bassist',
    items: ['Live Performance', 'Studio Recording', 'Session Musician', 'Groove Consultation']
  },
  {
    id: 2,
    title: 'Sound Engineer',
    items: ['Mixing', 'Mastering', 'Live Sound', 'Podcast Editing']
  },
  {
    id: 3,
    title: 'Videographer',
    items: ['Music Videos', 'Event Coverage', 'Documentaries', 'Video Editing']
  },
  {
    id: 4,
    title: 'Developer',
    items: ['Web Development', 'React Applications', 'UI/UX Implementation', 'Technical Consulting']
  }
];

export const aiLabsImages = [
  'https://picsum.photos/seed/ai1/400/225',
  'https://picsum.photos/seed/ai2/400/225',
  'https://picsum.photos/seed/ai3/400/225'
];

export const clients = [
  'Caroline Sithole (Jazz)',
  'Channty Natural (Reggae)',
  'The Space Live Band',
  'Tlotlo Hotel & Conference Center',
  'Masa Square Protea Hotel',
  'Colmas Studios',
  'Sound Hub Studios',
  'Livewire Recording Studios'
];

export const awards = [
  { name: 'Best Bassist', year: '2023', image: 'https://picsum.photos/seed/award1/100/100' },
  { name: 'Sound Mix Award', year: '2024', image: 'https://picsum.photos/seed/award2/100/100' }
];

export const faqs = [
  {
    question: 'Are you available for touring?',
    answer: 'Yes, I am available for both local and international tours. Please contact me for scheduling.'
  },
  {
    question: 'Do you provide mixing and mastering services online?',
    answer: 'Absolutely. You can send me your tracks, and I will deliver professional mixes and masters remotely.'
  },
  {
    question: 'What is your turnaround time for video editing?',
    answer: 'It depends on the project length and complexity, but typically I deliver within 1-2 weeks.'
  },
  {
    question: 'Can you build a website for my band?',
    answer: 'Yes, I specialize in creating portfolios and websites for artists and musicians.'
  }
];

export const companyInfo = {
  name: 'Ras Ali',
  tagline: 'Multi-Disciplinary Creative & Technologist',
  location: 'Gaborone, Botswana',
  description: "I am a multi-talented creative professional specializing in music, sound engineering, videography, and web development. I bring a unique blend of artistic and technical skills to every project.",
  aiLabsDescription: 'Exploring the intersection of creativity and technology. Constantly learning and experimenting with new tools to enhance artistic expression.'
};

export const socialLinks = [
  { name: 'Instagram', url: 'https://www.instagram.com/ali_chiwartze/', icon: 'Instagram' },
  { name: 'Facebook', url: 'https://www.facebook.com/share/18k8V1f6b5/', icon: 'Facebook' },
  { name: 'YouTube', url: 'https://youtube.com/@rasali2023?si=Q3W58-ZgWvFDrxN_', icon: 'Youtube' },
  { name: 'GitHub', url: 'https://github.com/maplininc', icon: 'Github' },
  { name: 'WhatsApp', url: 'https://wa.me/26777150423', icon: 'Phone' },
  { name: 'Email', url: 'mailto:rasali@themaplin.com', icon: 'Mail' }
];

