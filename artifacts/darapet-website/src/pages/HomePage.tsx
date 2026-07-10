import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { TypeAnimation } from 'react-type-animation';
import { ArrowRight, CheckCircle2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

import { services } from '@/data/services';
import { getPortfolioByCategory } from '@/data/portfolio';
import { testimonials } from '@/data/testimonials';

import ServiceCard from '@/components/ui/service-card';
import PortfolioCard from '@/components/ui/portfolio-card';
import TestimonialCard from '@/components/ui/testimonial-card';
import AnimatedCounter from '@/components/ui/animated-counter';

export default function HomePage() {
  const featuredPortfolio = getPortfolioByCategory('all').slice(0, 4);
  
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: 'start', skipSnaps: false }, 
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* HERO SECTION */}
      <section className="relative min-h-[100dvh] flex items-center pt-20 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-bg.jpg" 
            alt="Darapet Technology Background" 
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,102,255,0.15),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-md mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-medium text-primary tracking-wide uppercase">Available for new projects</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-white leading-[1.1] mb-6 tracking-tight">
                Where Vision Meets <br />
                <span className="text-gradient">Technology</span>
              </h1>
              
              <div className="text-2xl md:text-3xl lg:text-4xl text-white/80 font-medium mb-8 h-[40px] md:h-[48px]">
                We build premium solutions for{' '}
                <TypeAnimation
                  sequence={[
                    'Startups', 2000,
                    'Enterprises', 2000,
                    'Creators', 2000,
                    'Visionaries', 2000,
                  ]}
                  wrapper="span"
                  speed={50}
                  className="text-primary font-bold border-b-4 border-primary/30"
                  repeat={Infinity}
                />
              </div>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
                Darapet Technology is a world-class Nigerian creative agency delivering bold digital experiences. From code to content, we build what's next.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/contact">
                  <Button className="h-14 px-8 text-lg rounded-xl bg-primary hover:bg-primary/90 text-white hover-glow w-full sm:w-auto">
                    Start Your Project <ArrowRight className="ml-2" size={20} />
                  </Button>
                </Link>
                <Link href="/portfolio">
                  <Button variant="outline" className="h-14 px-8 text-lg rounded-xl border-white/20 hover:bg-white/10 text-white w-full sm:w-auto backdrop-blur-sm">
                    View Our Work <PlayCircle className="ml-2" size={20} />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce">
          <span className="text-xs uppercase tracking-widest text-white">Scroll</span>
          <div className="w-[1px] h-10 bg-gradient-to-b from-white to-transparent" />
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-20 bg-card border-y border-white/5 relative z-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 divide-x divide-white/5">
            <div className="flex flex-col items-center text-center">
              <div className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
                <AnimatedCounter end={150} suffix="+" />
              </div>
              <p className="text-primary font-medium tracking-wide uppercase text-sm">Projects Completed</p>
            </div>
            <div className="flex flex-col items-center text-center pl-8 md:pl-0">
              <div className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
                <AnimatedCounter end={80} suffix="+" />
              </div>
              <p className="text-primary font-medium tracking-wide uppercase text-sm">Happy Clients</p>
            </div>
            <div className="flex flex-col items-center text-center pt-8 md:pt-0 md:pl-0 border-t md:border-t-0 border-white/5">
              <div className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
                <AnimatedCounter end={6} suffix="+" />
              </div>
              <p className="text-primary font-medium tracking-wide uppercase text-sm">Years Experience</p>
            </div>
            <div className="flex flex-col items-center text-center pt-8 md:pt-0 pl-8 md:pl-0 border-t md:border-t-0 border-white/5">
              <div className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
                <AnimatedCounter end={15} suffix="+" />
              </div>
              <p className="text-primary font-medium tracking-wide uppercase text-sm">Team Members</p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="py-32 relative">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-2xl">
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-primary font-bold tracking-wider uppercase mb-4 block"
              >
                Our Expertise
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-display font-bold text-white"
              >
                Comprehensive digital services for modern brands.
              </motion.h2>
            </div>
            <Link href="/services" className="hidden md:flex">
              <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/5">
                View All Services <ArrowRight className="ml-2" size={16} />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </div>
          
          <div className="mt-8 flex justify-center md:hidden">
            <Link href="/services">
              <Button variant="outline" className="w-full rounded-full border-white/10 hover:bg-white/5">
                View All Services <ArrowRight className="ml-2" size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT SNIPPET SECTION */}
      <section className="py-32 bg-card relative overflow-hidden">
        <div className="absolute left-0 top-1/2 w-1/3 h-[600px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="relative">
                <div className="aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden glass border-white/10">
                  <img src="/images/app-1.jpg" alt="Team working" className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="absolute -bottom-8 -right-8 glass p-8 rounded-3xl max-w-xs border-primary/30 shadow-[0_10px_40px_rgba(0,102,255,0.2)] hidden md:block">
                  <p className="text-xl font-display font-bold text-white mb-2">Based in Lagos.</p>
                  <p className="text-primary font-medium">Impacting the world.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <span className="text-primary font-bold tracking-wider uppercase mb-4 block">About Darapet</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                We don't just build.<br/>We engineer growth.
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Founded by a team of passionate developers and digital creatives, Darapet Technology was built on a simple premise: African tech talent meets global standards. 
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Whether you need a scalable web application, a high-converting digital marketing campaign, or a striking brand identity, we bring relentless capability to every project. We are your dedicated technical partners.
              </p>
              
              <ul className="space-y-4 mb-10">
                {['Uncompromising Quality Standards', 'Data-Driven Strategy & Execution', 'Transparent Communication'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="text-primary" size={24} />
                    <span className="text-white text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/about">
                <Button className="h-14 px-8 text-lg rounded-xl bg-white text-background hover:bg-white/90">
                  Discover Our Story <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO PREVIEW */}
      <section className="py-32 relative">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-primary font-bold tracking-wider uppercase mb-4 block"
            >
              Selected Work
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-display font-bold text-white mb-6"
            >
              Projects that speak for themselves.
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {featuredPortfolio.map((project, index) => (
              <PortfolioCard key={project.id} project={project} index={index} />
            ))}
          </div>
          
          <div className="text-center">
            <Link href="/portfolio">
              <Button className="h-14 px-8 text-lg rounded-xl bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-white hover-glow transition-all duration-300">
                View Full Portfolio <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-32 bg-card relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-2xl">
              <span className="text-primary font-bold tracking-wider uppercase mb-4 block">Client Success</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
                Don't just take our word for it.
              </h2>
            </div>
          </div>

          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex -ml-4 touch-pan-y">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="min-w-0 flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] pl-4">
                  <TestimonialCard testimonial={testimonial} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-primary/5 z-0" />
        <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] opacity-20 mix-blend-overlay z-0" style={{ backgroundSize: 'cover', backgroundPosition: 'center' }} />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass rounded-[3rem] p-10 md:p-20 text-center max-w-5xl mx-auto border-primary/20 shadow-[0_0_50px_rgba(0,102,255,0.15)] relative overflow-hidden"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
            
            <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 relative z-10">
              Ready to build something <span className="text-primary">extraordinary?</span>
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto relative z-10">
              Whether you have a fully formed vision or just an idea, our team is ready to bring it to life. Let's start the conversation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link href="/contact">
                <Button className="h-16 px-10 text-xl rounded-2xl bg-primary hover:bg-primary/90 text-white hover-glow w-full sm:w-auto shadow-lg shadow-primary/30">
                  Let's Talk <ArrowRight className="ml-2" size={24} />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
    </div>
  );
}