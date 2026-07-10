import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ServiceCategory } from '@/data/services';
import { fadeInUp } from '@/lib/animations';

export default function ServiceCard({ service }: { service: ServiceCategory }) {
  const Icon = service.icon;
  
  return (
    <motion.div variants={fadeInUp} className="group">
      <div className="glass rounded-xl p-8 h-full flex flex-col hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden">
        {/* Hover Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-6 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
          <Icon className="w-7 h-7" />
        </div>
        
        <h3 className="text-xl font-display font-bold mb-3 relative z-10">{service.title}</h3>
        <p className="text-foreground/70 mb-6 flex-grow relative z-10">
          {service.shortDescription}
        </p>
        
        <div className="mt-auto relative z-10">
          <Link 
            href={`/services/${service.id}`} 
            className="inline-flex items-center text-sm font-semibold text-primary group-hover:text-blue-400 transition-colors"
          >
            Explore Service
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
