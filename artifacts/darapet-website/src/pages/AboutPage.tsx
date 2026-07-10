import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowRight, Trophy, Users, Globe, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { team } from '@/data/team';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      
      {/* PAGE HEADER */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-primary font-bold tracking-wider uppercase mb-4 block">About Us</span>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6">
              Engineering the future of <span className="text-gradient">digital experiences.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We are a team of passionate developers, designers, and strategists based in Lagos, building world-class technology solutions for clients globally.
            </p>
          </motion.div>
        </div>
      </section>

      {/* STORY SECTION */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white">The Darapet Story</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Darapet Technology started with a core belief: African technological talent can compete and win on the global stage. Our founder, a passionate developer, assembled a team of like-minded creatives and engineers to prove it.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                What began as a small web development shop has evolved into a full-service premium digital agency. Today, we handle complex software engineering, enterprise-grade cloud architecture, and high-impact digital marketing campaigns.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We don't just act as vendors; we become your technical partners. We immerse ourselves in your business goals and use technology as the lever to achieve them.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-4 pt-12">
                <img src="/images/web-1.jpg" alt="Office culture" className="rounded-2xl w-full h-48 object-cover border border-white/10" />
                <img src="/images/app-2.jpg" alt="Development" className="rounded-2xl w-full h-64 object-cover border border-white/10" />
              </div>
              <div className="space-y-4">
                <img src="/images/design-1.jpg" alt="Design process" className="rounded-2xl w-full h-64 object-cover border border-white/10" />
                <img src="/images/marketing-1.jpg" alt="Team meeting" className="rounded-2xl w-full h-48 object-cover border border-white/10" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* VALUES SECTION */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Our Core Values</h2>
            <p className="text-lg text-muted-foreground">The principles that guide every line of code we write and every strategy we deploy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Trophy, title: 'Excellence', desc: 'We do not ship mediocre work. Every project must meet global premium standards.' },
              { icon: Target, title: 'Precision', desc: 'Detail matters. From pixel-perfect UIs to optimized database queries, we are meticulous.' },
              { icon: Users, title: 'Partnership', desc: 'Your success is our success. We communicate transparently and build long-term relationships.' },
              { icon: Globe, title: 'Impact', desc: 'We build solutions that create measurable real-world results for your business.' }
            ].map((value, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass p-8 rounded-2xl border-white/10 hover:-translate-y-2 transition-transform duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-6">
                  <value.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM SECTION */}
      <section className="py-24 bg-card relative">
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Meet The Brains</h2>
            <p className="text-lg text-muted-foreground">The brilliant minds turning complex problems into elegant solutions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, i) => (
              <motion.div 
                key={member.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-3xl overflow-hidden group border-white/5"
              >
                <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
                  <div className="text-7xl font-display font-bold text-muted-foreground/30 absolute">{member.image}</div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90" />
                  
                  {/* Decorative elements to make the placeholder look cool */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,102,255,0.2),transparent_50%)]" />
                </div>
                
                <div className="p-8 relative -mt-16 z-10 bg-background/80 backdrop-blur-xl border-t border-white/10 rounded-t-3xl h-full">
                  <h3 className="text-2xl font-bold text-white mb-1">{member.name}</h3>
                  <p className="text-primary font-medium text-sm tracking-wide uppercase mb-4">{member.role}</p>
                  <p className="text-muted-foreground line-clamp-3">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE SECTION */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Our Journey</h2>
          </div>

          <div className="max-w-4xl mx-auto relative">
            <div className="absolute left-[15px] md:left-1/2 top-0 bottom-0 w-[2px] bg-white/10 md:-translate-x-1/2" />
            
            {[
              { year: '2019', title: 'The Beginning', desc: 'Darapet Technology founded as a boutique web development shop in Lagos.' },
              { year: '2020', title: 'First International Client', desc: 'Expanded our reach by delivering a complex e-commerce platform for a UK-based retailer.' },
              { year: '2021', title: 'Services Expansion', desc: 'Added Digital Marketing and Video Production arms to become a full-service agency.' },
              { year: '2023', title: '100th Project Milestone', desc: 'Successfully delivered our 100th major project, cementing our reputation for reliability.' },
              { year: 'Present', title: 'Global Tech Partner', desc: 'Now serving clients across 3 continents with enterprise-grade solutions and consulting.' }
            ].map((milestone, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`relative flex flex-col md:flex-row gap-8 mb-12 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="absolute left-[11px] md:left-1/2 w-3 h-3 bg-primary rounded-full ring-4 ring-background md:-translate-x-1/2 mt-6 md:mt-0" />
                
                <div className="ml-12 md:ml-0 md:w-1/2 p-6 glass rounded-2xl border-white/10 group hover:border-primary/50 transition-colors">
                  <span className="text-primary font-display font-bold text-xl mb-2 block">{milestone.year}</span>
                  <h3 className="text-xl font-bold text-white mb-2">{milestone.title}</h3>
                  <p className="text-muted-foreground">{milestone.desc}</p>
                </div>
                
                <div className="hidden md:block md:w-1/2" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-white text-center px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 text-white">Be Part of Our Next Chapter</h2>
          <p className="text-xl mb-10 text-white/90">Let's build something that makes an impact together.</p>
          <Link href="/contact">
            <Button className="h-14 px-8 text-lg rounded-xl bg-background text-foreground hover:bg-background/90 hover:scale-105 transition-transform">
              Contact Us Today <ArrowRight className="ml-2" size={20} />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}