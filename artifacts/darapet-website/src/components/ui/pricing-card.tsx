import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Link } from 'wouter';

interface PricingCardProps {
  tier: {
    name: string;
    price: string;
    features: string[];
    isPopular: boolean;
  };
  index: number;
}

export default function PricingCard({ tier, index }: PricingCardProps) {
  return (
    <div 
      className={`relative glass p-8 rounded-3xl flex flex-col ${
        tier.isPopular ? 'border-primary shadow-[0_0_30px_-10px_rgba(0,102,255,0.3)]' : 'border-white/10'
      }`}
      data-testid={`pricing-tier-${tier.name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {tier.isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
          Most Popular
        </div>
      )}
      
      <div className="mb-8">
        <h3 className="text-xl font-medium text-muted-foreground mb-2">{tier.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-display font-bold text-white">{tier.price}</span>
        </div>
      </div>
      
      <div className="flex-grow mb-8">
        <ul className="space-y-4">
          {tier.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-white/80">
              <Check size={20} className="text-primary shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <Link href="/contact" className="mt-auto" data-testid={`btn-select-tier-${tier.name.toLowerCase()}`}>
        <Button 
          className={`w-full h-12 rounded-xl text-md font-medium ${
            tier.isPopular 
              ? 'bg-primary hover:bg-primary/90 text-white hover-glow' 
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          Get Started
        </Button>
      </Link>
    </div>
  );
}