import React from 'react';
import { Link } from 'wouter';
import { Zap, Mail, MapPin, Phone, ArrowRight } from 'lucide-react';
import { SiLinkedin, SiTwitter, SiInstagram, SiGithub, SiYoutube } from 'react-icons/si';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-white/5 pt-24 pb-12 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          
          {/* Brand Col */}
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(0,102,255,0.5)]">
                <Zap size={24} className="fill-white" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-white">
                Darapet<span className="text-primary">Tech</span>
              </span>
            </Link>
            <p className="text-muted-foreground mb-8 text-lg leading-relaxed max-w-sm">
              Where Vision Meets Technology. A premium Nigerian tech agency delivering world-class digital solutions for bold brands globally.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors" aria-label="LinkedIn">
                <SiLinkedin size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors" aria-label="Twitter">
                <SiTwitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors" aria-label="Instagram">
                <SiInstagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors" aria-label="GitHub">
                <SiGithub size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors" aria-label="YouTube">
                <SiYoutube size={18} />
              </a>
            </div>
          </div>

          {/* Services Links */}
          <div className="lg:col-span-3 lg:col-start-6">
            <h3 className="text-white font-bold text-lg mb-6 font-display">Services</h3>
            <ul className="space-y-4">
              <li><Link href="/services/web-development" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"><ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-primary" /> Web Development</Link></li>
              <li><Link href="/services/digital-marketing" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"><ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-primary" /> Digital Marketing</Link></li>
              <li><Link href="/services/software-development" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"><ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-primary" /> Software Engineering</Link></li>
              <li><Link href="/services/video-production" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"><ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-primary" /> Video Production</Link></li>
              <li><Link href="/services/graphic-design" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"><ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-primary" /> Brand Design</Link></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-bold text-lg mb-6 font-display">Company</h3>
            <ul className="space-y-4">
              <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/portfolio" className="text-muted-foreground hover:text-primary transition-colors">Our Portfolio</Link></li>
              <li><Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">All Services</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
            </ul>
          </div>

          {/* Contact Col */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-bold text-lg mb-6 font-display">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={20} className="text-primary shrink-0 mt-1" />
                <span className="text-muted-foreground">Lagos, Nigeria<br/>Serving clients worldwide</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={20} className="text-primary shrink-0" />
                <a href="mailto:darapettechnology@gmail.com" className="text-muted-foreground hover:text-white transition-colors break-all">
                  darapettechnology<br/>@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={20} className="text-primary shrink-0" />
                <a href="tel:+2349134873694" className="text-muted-foreground hover:text-white transition-colors">
                  +234 9134873694
                </a>
              </li>
            </ul>
          </div>
          
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            &copy; {currentYear} Darapet Technology. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}