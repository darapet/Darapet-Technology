import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, ChevronDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { services } from '@/data/services';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/80 backdrop-blur-lg border-b border-white/10 py-4' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(0,102,255,0.5)] group-hover:shadow-[0_0_25px_rgba(0,102,255,0.8)] transition-all">
              <Zap size={24} className="fill-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white hidden sm:block">
              Darapet<span className="text-primary">Tech</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList className="gap-2">
                <NavigationMenuItem>
                  <Link href="/" className={navigationMenuTriggerStyle({
                    className: `bg-transparent hover:bg-white/5 text-white/80 hover:text-white ${location === '/' ? 'text-white font-medium' : ''}`
                  })}>
                    Home
                  </Link>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent hover:bg-white/5 text-white/80 hover:text-white">
                    Services
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[600px] p-6 glass border-white/10 rounded-xl">
                      <div className="grid grid-cols-2 gap-4">
                        {services.map((service) => {
                          const Icon = service.icon;
                          return (
                            <Link key={service.id} href={`/services/${service.id}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                              <div className={`mt-0.5 w-8 h-8 rounded-md flex items-center justify-center bg-background border border-white/5 ${service.color}`}>
                                <Icon size={16} />
                              </div>
                              <div>
                                <div className="font-medium text-white mb-1 group-hover:text-primary transition-colors">{service.title}</div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/10 text-center">
                        <Link href="/services" className="text-sm font-medium text-primary hover:text-white transition-colors">
                          View All Services &rarr;
                        </Link>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/portfolio" className={navigationMenuTriggerStyle({
                    className: `bg-transparent hover:bg-white/5 text-white/80 hover:text-white ${location.startsWith('/portfolio') ? 'text-white font-medium' : ''}`
                  })}>
                    Portfolio
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/about" className={navigationMenuTriggerStyle({
                    className: `bg-transparent hover:bg-white/5 text-white/80 hover:text-white ${location === '/about' ? 'text-white font-medium' : ''}`
                  })}>
                    About
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/contact">
              <Button className="bg-primary hover:bg-primary/90 text-white hover-glow rounded-xl px-6">
                Start a Project
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-white/80 hover:text-white bg-white/5 rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="btn-mobile-menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`md:hidden fixed inset-x-0 top-full bg-background border-b border-white/10 shadow-2xl transition-all duration-300 overflow-hidden ${
          mobileMenuOpen ? 'max-h-[calc(100vh-80px)] opacity-100 py-6' : 'max-h-0 opacity-0 py-0'
        }`}
      >
        <div className="container mx-auto px-4 flex flex-col gap-4">
          <Link href="/" className="text-lg font-medium p-3 rounded-lg hover:bg-white/5 text-white/90">Home</Link>
          
          <div className="space-y-2">
            <div className="text-lg font-medium p-3 text-white/90 border-b border-white/10">Services</div>
            <div className="pl-4 grid grid-cols-1 gap-2">
              <Link href="/services" className="p-2 text-primary">All Services &rarr;</Link>
              {services.map(service => (
                <Link key={service.id} href={`/services/${service.id}`} className="p-2 text-muted-foreground hover:text-white flex items-center gap-2">
                  <service.icon size={16} className={service.color} />
                  {service.title}
                </Link>
              ))}
            </div>
          </div>
          
          <Link href="/portfolio" className="text-lg font-medium p-3 rounded-lg hover:bg-white/5 text-white/90">Portfolio</Link>
          <Link href="/about" className="text-lg font-medium p-3 rounded-lg hover:bg-white/5 text-white/90">About Us</Link>
          <Link href="/contact" className="text-lg font-medium p-3 rounded-lg hover:bg-white/5 text-white/90">Contact</Link>
          
          <div className="pt-4 mt-2 border-t border-white/10">
            <Link href="/contact" className="block w-full">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 text-lg">
                Start a Project
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}