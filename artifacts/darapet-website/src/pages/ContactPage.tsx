import React from 'react';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Mail, MapPin, Phone, MessageSquare, Send } from 'lucide-react';
import { SiLinkedin, SiTwitter, SiInstagram } from 'react-icons/si';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { services } from '@/data/services';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().optional(),
  service: z.string({ required_error: 'Please select a service.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

export default function ContactPage() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      service: '',
      message: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // In a real app, this would send to an API
    console.log(values);
    toast({
      title: 'Message Sent Successfully',
      description: "We've received your inquiry and will get back to you within 24 hours.",
    });
    form.reset();
  }

  return (
    <div className="flex flex-col min-h-screen pt-24">
      
      {/* PAGE HEADER */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-primary font-bold tracking-wider uppercase mb-4 block">Get In Touch</span>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6">
              Let's start a <span className="text-gradient">conversation.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Have a project in mind? Looking for a technical partner? Reach out and our team will get back to you within 24 hours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CONTACT CONTENT */}
      <section className="py-12 pb-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
            
            {/* Info Column */}
            <div className="lg:col-span-4 space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass p-8 rounded-3xl border-white/10 shadow-xl"
              >
                <h3 className="text-2xl font-bold text-white mb-8">Contact Information</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Mail size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Email Us</p>
                      <a href="mailto:darapettechnology@gmail.com" className="text-lg font-medium text-white hover:text-primary transition-colors break-all">
                        darapettechnology@gmail.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Phone size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Call or WhatsApp</p>
                      <a href="tel:+2349134873694" className="text-lg font-medium text-white hover:text-primary transition-colors">
                        +234 9134873694
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Location</p>
                      <p className="text-lg font-medium text-white">
                        Lagos, Nigeria<br />
                        <span className="text-sm font-normal text-muted-foreground">(Serving clients worldwide)</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/10">
                  <p className="text-sm font-medium text-muted-foreground mb-4">Follow us on social media</p>
                  <div className="flex items-center gap-4">
                    <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-colors">
                      <SiLinkedin size={18} />
                    </a>
                    <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-colors">
                      <SiTwitter size={18} />
                    </a>
                    <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-colors">
                      <SiInstagram size={18} />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Form Column */}
            <div className="lg:col-span-8">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="glass p-8 md:p-12 rounded-3xl border-white/10 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                
                <h2 className="text-3xl font-display font-bold text-white mb-2">Send us a message</h2>
                <p className="text-muted-foreground mb-8">Fill out the form below and we'll get back to you promptly.</p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10" data-testid="contact-form">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white/80">Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" className="bg-background/50 border-white/10 focus-visible:ring-primary h-12 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white/80">Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="john@example.com" type="email" className="bg-background/50 border-white/10 focus-visible:ring-primary h-12 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white/80">Phone Number (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 234 567 8900" className="bg-background/50 border-white/10 focus-visible:ring-primary h-12 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="service"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white/80">Service Interested In</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background/50 border-white/10 focus-visible:ring-primary h-12 rounded-xl">
                                  <SelectValue placeholder="Select a service" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background border-white/10">
                                {services.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                                ))}
                                <SelectItem value="other">Other / Not Sure</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Project Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us about your project, goals, and timeline..." 
                              className="bg-background/50 border-white/10 focus-visible:ring-primary min-h-[150px] rounded-xl resize-y" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full md:w-auto h-14 px-8 text-lg rounded-xl bg-primary hover:bg-primary/90 text-white hover-glow">
                      Send Message <Send className="ml-2" size={18} />
                    </Button>
                  </form>
                </Form>
              </motion.div>
            </div>
            
          </div>
        </div>
      </section>

    </div>
  );
}