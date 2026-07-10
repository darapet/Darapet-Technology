import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { PortfolioItem } from '@/data/portfolio';
import { fadeInUp } from '@/lib/animations';

export default function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <motion.div variants={fadeInUp} className="group relative overflow-hidden rounded-xl aspect-[4/3]">
      <img 
        src={item.image} 
        alt={item.title} 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold mb-3">
            {item.categoryLabel}
          </span>
          <h3 className="text-xl font-display font-bold text-white mb-2">{item.title}</h3>
          <p className="text-white/70 text-sm mb-4 line-clamp-2">{item.description}</p>
          
          <Link href={`/portfolio?project=${item.id}`} className="inline-flex items-center text-primary font-semibold text-sm hover:text-white transition-colors">
            View Project <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
