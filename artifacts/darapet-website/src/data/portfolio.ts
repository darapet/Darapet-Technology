export const portfolio = [
  {
    id: '1',
    title: 'PaySwift Fintech App',
    category: 'software',
    categoryLabel: 'Software Development',
    description: 'A comprehensive cross-platform mobile wallet for a Lagos-based fintech startup, handling over $2M in daily transactions.',
    image: '/images/app-1.jpg',
    client: 'PaySwift Africa'
  },
  {
    id: '2',
    title: 'Nexus Commerce Platform',
    category: 'web',
    categoryLabel: 'Web Development',
    description: 'A headless e-commerce solution built with React and Node.js for a leading pan-African retail brand.',
    image: '/images/web-2.jpg',
    client: 'Nexus Retail Hub'
  },
  {
    id: '3',
    title: 'AeroBank Growth Campaign',
    category: 'marketing',
    categoryLabel: 'Digital Marketing',
    description: 'A targeted multi-channel digital marketing campaign that increased user acquisition by 340% in Q3.',
    image: '/images/marketing-1.jpg',
    client: 'AeroBank Nigeria'
  },
  {
    id: '4',
    title: 'TechVision Rebrand',
    category: 'design',
    categoryLabel: 'Graphic Design',
    description: 'Complete brand identity overhaul including logo, brand guidelines, and corporate stationery for an IT firm.',
    image: '/images/design-1.jpg',
    client: 'TechVision IT Solutions'
  },
  {
    id: '5',
    title: 'AgriConnect Explainer',
    category: 'video',
    categoryLabel: 'Video Production',
    description: 'A highly engaging 3D animated explainer video that simplified complex agritech concepts for investors.',
    image: '/images/video-1.jpg',
    client: 'AgriConnect'
  },
  {
    id: '6',
    title: 'Lagos Transit Tracker',
    category: 'web',
    categoryLabel: 'Web Development',
    description: 'A real-time transit tracking web application featuring interactive maps and live schedules.',
    image: '/images/web-1.jpg',
    client: 'Lagos State Transport'
  },
  {
    id: '7',
    title: 'Oasis Wellness App',
    category: 'software',
    categoryLabel: 'Software Development',
    description: 'A bespoke mobile app connecting users with wellness professionals, featuring in-app video consultations.',
    image: '/images/app-2.jpg',
    client: 'Oasis Health Care'
  },
  {
    id: '8',
    title: 'Savvy Shopper Social',
    category: 'marketing',
    categoryLabel: 'Digital Marketing',
    description: 'Viral social media campaign management and influencer partnerships resulting in 5M+ impressions.',
    image: '/images/marketing-2.jpg',
    client: 'Savvy Shopper Ltd'
  }
];

export const getPortfolioByCategory = (category: string) => {
  if (category === 'all' || !category) return portfolio;
  return portfolio.filter(item => item.category === category);
};