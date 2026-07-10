import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { getPortfolioByCategory } from '@/data/portfolio';
import PortfolioCard from '@/components/ui/portfolio-card';
import { Button } from '@/components/ui/button';

const categories = [
  { id: 'all', label: 'All Projects' },
  { id: 'web', label: 'Web Development' },
  { id: 'marketing', label: 'Digital Marketing' },
  { id: 'software', label: 'Software' },
  { id: 'video', label: 'Video Production' },
  { id: 'design', label: 'Design' }
];

export default function PortfolioPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [_, setLocation] = useLocation();
  
  const projects = getPortfolioByCategory(activeCategory);

  return (
    <div className="flex flex-col min-h-screen pt-24">
      
      {/* PAGE HEADER */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-primary font-bold tracking-wider uppercase mb-4 block">Our Work</span>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6">
              Case studies in <span className="text-gradient">excellence.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We let our results speak for themselves. Browse a selection of our recent projects across web, marketing, software, and design.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FILTER BAR */}
      <section className="pb-8 sticky top-20 z-40 bg-background/90 backdrop-blur-xl border-b border-white/5 py-4">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-start md:justify-center overflow-x-auto pb-2 scrollbar-hide space-x-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  // Optional: Update URL without full navigation
                  // setLocation(`/portfolio${cat.id === 'all' ? '' : `/${cat.id}`}`);
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                }`}
                data-testid={`filter-btn-${cat.id}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO GRID */}
      <section className="py-16 pb-32 flex-grow">
        <div className="container mx-auto px-4 md:px-6">
          <AnimatePresence mode="popLayout">
            <motion.div 
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {projects.length > 0 ? (
                projects.map((project, index) => (
                  <PortfolioCard key={project.id} project={project} index={index} />
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <p className="text-2xl font-medium text-white mb-4">More projects coming soon.</p>
                  <p className="text-muted-foreground mb-8">We're currently updating our case studies for this category.</p>
                  <Button variant="outline" onClick={() => setActiveCategory('all')}>
                    View All Projects
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-card text-center border-t border-white/5">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 text-white">Your project belongs here.</h2>
          <p className="text-xl mb-10 text-muted-foreground">Ready to create something that stands out?</p>
          <Link href="/contact">
            <Button className="h-14 px-8 text-lg rounded-xl bg-primary hover:bg-primary/90 text-white hover-glow">
              Start Your Project
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}