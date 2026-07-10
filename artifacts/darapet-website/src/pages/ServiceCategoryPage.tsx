import React from 'react';
import { useRoute, Link, Redirect } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { getService } from '@/data/services';
import { getPortfolioByCategory } from '@/data/portfolio';
import { Button } from '@/components/ui/button';
import PortfolioCard from '@/components/ui/portfolio-card';

export default function ServiceCategoryPage() {
  const [match, params] = useRoute('/services/:category');
  
  if (!match || !params?.category) return null;
  
  const service = getService(params.category);
  
  // If category doesn't exist, redirect to services index
  if (!service) {
    return <Redirect to="/services" />;
  }

  const relatedPortfolio = getPortfolioByCategory(
    params.category.includes('web') ? 'web' : 
    params.category.includes('marketing') ? 'marketing' : 
    params.category.includes('software') ? 'software' : 
    params.category.includes('video') ? 'video' : 
    params.category.includes('design') ? 'design' : 'all'
  ).slice(0, 2);

  const Icon = service.icon;

  return (
    <div className="flex flex-col min-h-screen pt-24">
      
      {/* HERO SECTION */}
      <section className="py-20 relative overflow-hidden border-b border-white/5">
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl">
            <Link href="/services" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
              <ArrowRight className="mr-2 rotate-180" size={16} /> Back to all services
            </Link>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-6 mb-6"
            >
              <div className={`w-20 h-20 rounded-2xl bg-background border border-white/10 flex items-center justify-center shrink-0 ${service.color} shadow-lg`}>
                <Icon size={40} />
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white">
                {service.title}
              </h1>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-muted-foreground leading-relaxed max-w-2xl"
            >
              {service.description} We build robust, scalable solutions engineered for high performance and growth.
            </motion.p>
          </div>
        </div>
      </section>

      {/* SUB-SERVICES GRID */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">Specialized Offerings</h2>
            <p className="text-lg text-muted-foreground">Select a discipline to view pricing and specific processes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {service.subServices.map((sub, index) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/services/${service.id}/${sub.id}`} className="block h-full outline-none group">
                  <div className="glass p-8 rounded-3xl h-full border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all duration-300">
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-primary transition-colors">{sub.title}</h3>
                    <p className="text-muted-foreground mb-8 text-lg">{sub.description}</p>
                    <div className="flex items-center text-white font-medium">
                      View Details & Pricing <ArrowRight size={18} className="ml-2 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT WORK */}
      {relatedPortfolio.length > 0 && (
        <section className="py-24 bg-card border-t border-white/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">Recent {service.title} Work</h2>
                <p className="text-lg text-muted-foreground">See how we've helped other businesses.</p>
              </div>
              <Link href="/portfolio">
                <Button variant="outline" className="border-white/10 hover:bg-white/5">
                  View Full Portfolio
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {relatedPortfolio.map((project, index) => (
                <PortfolioCard key={project.id} project={project} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 text-center px-4 relative">
        <div className="container mx-auto max-w-4xl relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white">Ready to elevate your business?</h2>
          <p className="text-xl mb-10 text-muted-foreground">Let's discuss how our {service.title.toLowerCase()} expertise can drive your growth.</p>
          <Link href="/contact">
            <Button className="h-16 px-10 text-xl rounded-2xl bg-primary hover:bg-primary/90 text-white hover-glow">
              Start a Project <ArrowRight className="ml-2" size={24} />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}