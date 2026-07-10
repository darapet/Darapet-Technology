import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
  };
  index: number;
}

export default function ServiceCard({ service, index }: ServiceCardProps) {
  const Icon = service.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link href={`/services/${service.id}`} className="block h-full group outline-none" data-testid={`service-card-${service.id}`}>
        <div className="glass h-full p-8 rounded-2xl flex flex-col hover-glow relative overflow-hidden transition-all duration-300 group-hover:-translate-y-2 group-focus-visible:ring-2 group-focus-visible:ring-primary">
          {/* Subtle gradient background effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-background/80 border border-white/5 shadow-lg mb-6 ${service.color}`}>
            <Icon size={28} />
          </div>
          
          <h3 className="text-2xl font-bold mb-3 text-white">{service.title}</h3>
          
          <p className="text-muted-foreground mb-8 flex-grow">
            {service.description}
          </p>
          
          <div className="mt-auto flex items-center text-primary font-medium group-hover:translate-x-2 transition-transform duration-300">
            Explore Services <ArrowRight size={18} className="ml-2" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}