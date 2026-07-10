import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TestimonialCardProps {
  testimonial: {
    id: number;
    name: string;
    role: string;
    company: string;
    content: string;
    rating: number;
    avatar: string;
  };
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <div className="glass p-8 rounded-2xl h-full flex flex-col mx-2 border border-white/5" data-testid={`testimonial-${testimonial.id}`}>
      <div className="flex text-primary mb-6">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            size={18} 
            className={i < testimonial.rating ? "fill-primary text-primary" : "text-muted"} 
          />
        ))}
      </div>
      
      <p className="text-lg text-white/90 mb-8 flex-grow leading-relaxed">
        "{testimonial.content}"
      </p>
      
      <div className="flex items-center gap-4 mt-auto">
        <Avatar className="h-12 w-12 border border-white/10">
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {testimonial.avatar}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-bold text-white">{testimonial.name}</h4>
          <p className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
        </div>
      </div>
    </div>
  );
}