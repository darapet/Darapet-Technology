import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';
import { Star } from 'lucide-react';

interface TestimonialProps {
  testimonial: {
    name: string;
    role: string;
    company: string;
    rating: number;
    text: string;
    avatar: string;
  };
}

export default function TestimonialCard({ testimonial }: TestimonialProps) {
  return (
    <motion.div variants={fadeInUp} className="h-full">
      <div className="glass rounded-xl p-8 h-full flex flex-col relative">
        <div className="flex gap-1 mb-4 text-primary">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < testimonial.rating ? 'fill-current' : 'text-muted'}`} />
          ))}
        </div>
        
        <p className="text-foreground/80 text-lg mb-8 flex-grow italic">
          "{testimonial.text}"
        </p>
        
        <div className="flex items-center gap-4 mt-auto">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
            <img src={testimonial.avatar} alt={testimonial.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="font-bold">{testimonial.name}</h4>
            <p className="text-sm text-primary">{testimonial.role}, {testimonial.company}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
