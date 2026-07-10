import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full glass p-10 rounded-3xl border border-white/10 relative overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        
        <h1 className="text-8xl font-display font-bold text-white mb-4 tracking-tighter">4<span className="text-primary">0</span>4</h1>
        <h2 className="text-2xl font-bold text-white mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
          <Link href="/">
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 hover-glow">
              <Home size={18} /> Back to Home
            </Button>
          </Link>
          <Button variant="outline" className="w-full sm:w-auto rounded-xl gap-2 border-white/10 hover:bg-white/5" onClick={() => window.history.back()}>
            <ArrowLeft size={18} /> Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}