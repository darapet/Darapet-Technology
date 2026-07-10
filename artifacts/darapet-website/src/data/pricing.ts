export const pricingTiers = {
  web: [
    { name: 'Starter', price: '$999', features: ['Up to 5 Pages', 'Mobile Responsive', 'Basic SEO', 'Contact Form', '1 Month Support'], isPopular: false },
    { name: 'Professional', price: '$2,499', features: ['Up to 15 Pages', 'Custom Design', 'CMS Integration', 'Advanced SEO', 'Analytics Setup', '3 Months Support'], isPopular: true },
    { name: 'Enterprise', price: 'Custom', features: ['Unlimited Pages', 'Complex Web Apps', 'E-commerce (1000+ products)', 'Custom API Integration', 'Dedicated Account Manager'], isPopular: false }
  ],
  marketing: [
    { name: 'Starter', price: '$499/mo', features: ['2 Social Platforms', '8 Posts/month', 'Basic Monthly Report', 'Email Support'], isPopular: false },
    { name: 'Professional', price: '$1,299/mo', features: ['4 Social Platforms', '20 Posts/month', 'Ad Campaign Management ($1k spend)', 'Bi-weekly Reports', 'Priority Support'], isPopular: true },
    { name: 'Enterprise', price: '$3,499/mo', features: ['All Platforms', 'Daily Posting', 'Full Ad Management', 'SEO Optimization', 'Weekly Strategy Calls'], isPopular: false }
  ],
  software: [
    { name: 'MVP', price: '$4,999', features: ['Core Feature Development', 'Basic UI/UX', 'Single Platform (Web/Mobile)', 'Standard Architecture', '30 Days Testing'], isPopular: false },
    { name: 'Standard App', price: '$12,499', features: ['Full Feature Set', 'Custom UI/UX', 'Cross Platform (Web + Mobile)', 'Scalable Cloud Architecture', '90 Days Support'], isPopular: true },
    { name: 'Enterprise System', price: 'Custom', features: ['Complex Integrations', 'High-availability Setup', 'Enterprise Grade Security', 'Microservices', '24/7 SLA Support'], isPopular: false }
  ],
  video: [
    { name: 'Standard', price: '$799', features: ['Up to 60 Seconds', 'Script Writing', 'Standard Voiceover', 'Background Music', '2 Revisions'], isPopular: false },
    { name: 'Premium', price: '$1,899', features: ['Up to 3 Minutes', 'Custom Animation/Shooting', 'Professional Voiceover', 'Sound Design', 'Unlimited Revisions'], isPopular: true },
    { name: 'Campaign Series', price: '$4,999', features: ['3-5 Video Series', 'Full Creative Direction', 'Multi-format (YT, IG, TikTok)', 'Source Files', 'Dedicated Producer'], isPopular: false }
  ],
  design: [
    { name: 'Essential Brand', price: '$499', features: ['Logo Design (2 Concepts)', 'Color Palette', 'Typography', 'Business Cards'], isPopular: false },
    { name: 'Full Identity', price: '$1,299', features: ['Logo Design (4 Concepts)', 'Comprehensive Brand Book', 'Social Media Kit', 'Letterhead & Envelopes', '3 Revisions'], isPopular: true },
    { name: 'UI/UX Package', price: '$2,999', features: ['Up to 15 Screens', 'Interactive Prototype', 'Design System', 'Developer Handoff Files', 'User Testing Insights'], isPopular: false }
  ],
  it: [
    { name: 'Audit', price: '$499', features: ['System Security Scan', 'Performance Review', 'Architecture Assessment', 'Detailed Report', '1 Hour Consultation'], isPopular: false },
    { name: 'Retainer', price: '$1,499/mo', features: ['24/7 Monitoring', 'Monthly Security Updates', 'Priority Tech Support (20 hrs)', 'Cloud Cost Optimization', 'Monthly Strategy Call'], isPopular: true },
    { name: 'Transformation', price: 'Custom', features: ['Full Cloud Migration', 'Compliance Implementation (ISO/GDPR)', 'Custom Security Solutions', 'Dedicated Virtual CIO'], isPopular: false }
  ]
};

export const getPricing = (category: string) => {
  if (category.includes('web')) return pricingTiers.web;
  if (category.includes('marketing')) return pricingTiers.marketing;
  if (category.includes('software') || category.includes('app')) return pricingTiers.software;
  if (category.includes('video')) return pricingTiers.video;
  if (category.includes('design')) return pricingTiers.design;
  return pricingTiers.it;
};