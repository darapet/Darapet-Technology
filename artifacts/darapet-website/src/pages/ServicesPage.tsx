import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowRight, Code, Megaphone, Smartphone, Video, PenTool, Server } from 'lucide-react';
import { services } from '@/data/services';
import ServiceCard from '@/components/ui/service-card';
import { Button } from '@/components/ui/button';

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      
      {/* PAGE HEADER */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-primary font-bold tracking-wider uppercase mb-4 block">Our Expertise</span>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6">
              Comprehensive <span className="text-gradient">digital solutions.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              From robust software architecture to high-converting marketing campaigns. We deliver end-to-end services that drive business growth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="py-12 pb-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS TIMELINE */}
      <section className="py-24 bg-card relative border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">How We Work</h2>
            <p className="text-lg text-muted-foreground">A proven methodology for delivering excellence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: '01', title: 'Discovery', desc: 'Deep dive into your business, goals, and technical requirements.' },
              { num: '02', title: 'Strategy & Design', desc: 'Architecting the solution and designing intuitive user experiences.' },
              { num: '03', title: 'Development', desc: 'Agile execution using modern, scalable tech stacks.' },
              { num: '04', title: 'Launch & Scale', desc: 'Rigorous testing, deployment, and ongoing optimization.' }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="text-6xl font-display font-bold text-white/5 absolute -top-8 -left-4 select-none">{step.num}</div>
                <div className="glass p-8 rounded-2xl h-full border-white/10 relative z-10 hover:border-primary/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl mb-6">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-4">
        <div className="container mx-auto max-w-3xl glass p-16 rounded-[3rem] border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/10" />
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 text-white relative z-10">Need a custom solution?</h2>
          <p className="text-xl mb-10 text-muted-foreground relative z-10">Not sure which service fits your needs? Let's discuss your unique challenges.</p>
          <Link href="/contact" className="relative z-10">
            <Button className="h-14 px-8 text-lg rounded-xl bg-primary hover:bg-primary/90 text-white hover-glow">
              Consult an Expert <ArrowRight className="ml-2" size={20} />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}