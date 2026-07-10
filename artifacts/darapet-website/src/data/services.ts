import { 
  Code, MonitorPlay, Smartphone, PenTool, LayoutDashboard, Database, 
  Megaphone, Search, Share2, Mail, Video, Film, Youtube, PlayCircle,
  Briefcase, ShieldCheck, Cloud, Server
} from 'lucide-react';

export const services = [
  {
    id: 'web-development',
    title: 'Web Development',
    description: 'We build fast, scalable, and secure web applications tailored to your business needs.',
    icon: Code,
    color: 'text-blue-500',
    subServices: [
      { id: 'frontend', title: 'Frontend Development', description: 'Responsive and interactive user interfaces using React, Vue, and modern CSS.' },
      { id: 'backend', title: 'Backend Development', description: 'Robust server-side architecture and databases.' },
      { id: 'fullstack', title: 'Full-Stack Development', description: 'End-to-end web solutions from database to UI.' },
      { id: 'ecommerce', title: 'E-commerce Solutions', description: 'Custom online stores that drive sales.' },
    ]
  },
  {
    id: 'digital-marketing',
    title: 'Digital Marketing',
    description: 'Data-driven marketing strategies to grow your audience and increase conversions.',
    icon: Megaphone,
    color: 'text-purple-500',
    subServices: [
      { id: 'seo', title: 'SEO & Search Marketing', description: 'Rank higher on Google and drive organic traffic.' },
      { id: 'social-media', title: 'Social Media Marketing', description: 'Engaging content and community management.' },
      { id: 'email-marketing', title: 'Email Marketing', description: 'Targeted campaigns that convert leads.' },
      { id: 'ppc', title: 'PPC & Google Ads', description: 'High-ROI paid advertising campaigns.' },
    ]
  },
  {
    id: 'software-development',
    title: 'Software Development',
    description: 'Custom software solutions designed to streamline your business operations.',
    icon: Smartphone,
    color: 'text-cyan-500',
    subServices: [
      { id: 'mobile-apps', title: 'Mobile App Development', description: 'Native and cross-platform apps for iOS and Android.' },
      { id: 'desktop', title: 'Desktop Software', description: 'Powerful desktop applications for Mac and Windows.' },
      { id: 'api-development', title: 'API Development', description: 'Secure and scalable REST & GraphQL APIs.' },
      { id: 'custom-software', title: 'Custom Solutions', description: 'Bespoke software tailored to unique challenges.' },
    ]
  },
  {
    id: 'video-production',
    title: 'Video Production',
    description: 'Compelling visual storytelling through high-quality video production and animation.',
    icon: Video,
    color: 'text-rose-500',
    subServices: [
      { id: 'animation', title: 'Animation & Motion Graphics', description: 'Dynamic 2D and 3D animations.' },
      { id: 'video-editing', title: 'Video Editing', description: 'Professional post-production and color grading.' },
      { id: 'youtube', title: 'YouTube Content', description: 'End-to-end production for YouTube creators.' },
      { id: 'explainer', title: 'Explainer Videos', description: 'Clear and engaging videos to explain your product.' },
    ]
  },
  {
    id: 'graphic-design',
    title: 'Graphic Design',
    description: 'Bold, memorable branding and design that sets you apart from the competition.',
    icon: PenTool,
    color: 'text-amber-500',
    subServices: [
      { id: 'logo', title: 'Logo & Brand Identity', description: 'Distinctive logos and comprehensive brand guidelines.' },
      { id: 'ui-ux', title: 'UI/UX Design', description: 'Intuitive user experiences and beautiful interfaces.' },
      { id: 'print', title: 'Print Design', description: 'Business cards, brochures, and physical marketing.' },
      { id: 'social-media-graphics', title: 'Social Media Graphics', description: 'Eye-catching visuals for your social channels.' },
    ]
  },
  {
    id: 'it-consulting',
    title: 'IT Consulting',
    description: 'Strategic technology consulting to help you navigate the digital landscape.',
    icon: Server,
    color: 'text-emerald-500',
    subServices: [
      { id: 'tech-strategy', title: 'Tech Strategy', description: 'Aligning technology with your business goals.' },
      { id: 'cloud', title: 'Cloud Solutions', description: 'AWS, Azure, and Google Cloud infrastructure.' },
      { id: 'cybersecurity', title: 'Cybersecurity', description: 'Protecting your digital assets and user data.' },
      { id: 'it-support', title: 'IT Support', description: 'Reliable technical support and maintenance.' },
    ]
  }
];

export type ServiceCategory = (typeof services)[number];

export const getService = (id: string) => services.find(s => s.id === id);
export const getSubService = (serviceId: string, subId: string) => {
  const service = getService(serviceId);
  return service?.subServices.find(s => s.id === subId);
};