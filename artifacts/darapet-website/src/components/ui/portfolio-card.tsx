import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface PortfolioCardProps {
  project: {
    id: string;
    title: string;
    category: string;
    categoryLabel: string;
    description: string;
    image: string;
    client: string;
  };
  index: number;
}

export default function PortfolioCard({ project, index }: PortfolioCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      className="group relative rounded-2xl overflow-hidden glass border-white/10"
      data-testid={`portfolio-card-${project.id}`}
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        <img 
          src={project.image} 
          alt={project.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://placehold.co/800x600/0a1628/0066FF?text=${encodeURIComponent(project.title)}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-80" />
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end">
        <div className="mb-3 flex items-center justify-between">
          <span className="px-3 py-1 text-xs font-medium bg-primary/20 text-primary border border-primary/30 rounded-full backdrop-blur-sm">
            {project.categoryLabel}
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {project.description}
        </p>
        
        <Link href={`/contact`} className="inline-flex items-center text-sm font-medium text-white group/btn">
          Start a project like this 
          <ArrowRight size={16} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}