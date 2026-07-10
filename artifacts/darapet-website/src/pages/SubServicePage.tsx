import React from 'react';
import { useRoute, Link, Redirect } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import { getService, getSubService } from '@/data/services';
import { getPricing } from '@/data/pricing';
import { Button } from '@/components/ui/button';
import PricingCard from '@/components/ui/pricing-card';

export default function SubServicePage() {
  const [match, params] = useRoute('/services/:category/:subservice');
  
  if (!match || !params?.category || !params?.subservice) return null;
  
  const service = getService(params.category);
  const subService = getSubService(params.category, params.subservice);
  
  if (!service || !subService) {
    return <Redirect to="/services" />;
  }

  const pricingData = getPricing(params.category);
  const Icon = service.icon;

  // Generic deliverables list based on category
  const getDeliverables = () => {
    if (params.category.includes('web') || params.category.includes('software')) {
      return ['Clean, scalable source code', 'Technical documentation', 'Responsive UI implementation', 'API integration', 'Performance optimization', 'Quality assurance testing'];
    }
    if (params.category.includes('marketing')) {
      return ['Custom strategy document', 'Content calendar', 'Performance analytics dashboard', 'Audience targeting setup', 'A/B testing protocols', 'Monthly reporting'];
    }
    if (params.category.includes('design') || params.category.includes('video')) {
      return ['High-resolution source files', 'Brand style guide', 'Multiple format exports', 'Revisions round', 'Commercial usage rights', 'Asset library setup'];
    }
    return ['Comprehensive audit report', 'Implementation roadmap', 'Security compliance check', 'Vendor assessment', 'Training sessions', 'Ongoing support SLA'];
  };

  return (
    <div className="flex flex-col min-h-screen pt-24">
      
      {/* HERO SECTION */}
      <section className="py-20 relative overflow-hidden bg-card border-b border-white/5">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl">
            <Link href={`/services/${service.id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
              <ArrowRight className="mr-2 rotate-180" size={16} /> Back to {service.title}
            </Link>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 mb-6 text-sm text-primary font-medium">
                <Icon size={16} /> {service.title} Specialty
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6">
                {subService.title}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mb-10">
                {subService.description} We deliver premium craftsmanship designed to scale with your ambition.
              </p>
              
              <div className="flex gap-4">
                <Button className="h-14 px-8 text-lg rounded-xl bg-primary hover:bg-primary/90 text-white hover-glow" onClick={() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  View Pricing
                </Button>
                <Link href="/contact">
                  <Button variant="outline" className="h-14 px-8 text-lg rounded-xl border-white/20 text-white hover:bg-white/5">
                    Discuss Project
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* OVERVIEW & DELIVERABLES */}
      <section className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-6">The Darapet Approach</h2>
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  Generic templates and cookie-cutter strategies don't move the needle. We treat every {subService.title.toLowerCase()} project as a bespoke challenge requiring a tailored solution.
                </p>
                <p>
                  Our team combines deep technical expertise with strategic business thinking. We don't just execute tasks; we consult on best practices, identify potential pitfalls before they happen, and architect solutions built for the long term.
                </p>
                <p>
                  When you work with us, you're getting a dedicated partner committed to delivering work that outshines your competitors and engages your audience.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass p-8 md:p-12 rounded-3xl border-white/10"
            >
              <h3 className="text-2xl font-bold text-white mb-8">What You Get</h3>
              <ul className="space-y-4">
                {getDeliverables().map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <CheckCircle2 className="text-primary shrink-0 mt-1" size={24} />
                    <span className="text-lg text-white/90">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-card relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">Select the tier that fits your scale. No hidden fees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingData.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <PricingCard tier={tier} index={index} />
              </motion.div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-6">Need a custom scope not listed here?</p>
            <Link href="/contact">
              <Button variant="outline" className="border-white/20 hover:bg-white/5">
                Contact Sales for Enterprise
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}