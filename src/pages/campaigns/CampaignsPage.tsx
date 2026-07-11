import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Plus, History, Clock, Sparkles, ArrowRight, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const WELCOME_KEY = 'darapet_campaign_welcome_v1';

function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const { profile } = useAuth();
  const name = profile?.name?.split(' ')[0] || 'there';
  const LINES = [
    `Welcome to Campaigns, ${name}! 👋`,
    'This is your email marketing command center.',
    'Create rich campaigns, schedule sends, and track results.',
    'Let\'s get started →',
  ];
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (lineIdx >= LINES.length) { setDone(true); return; }
    const cur = LINES[lineIdx];
    if (charIdx < cur.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 28);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setLineIdx(l => l + 1); setCharIdx(0); }, 600);
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div className="max-w-lg w-full px-6 text-center space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"
        >
          <Mail className="w-10 h-10 text-primary" />
        </motion.div>

        <div className="space-y-3 min-h-[120px]">
          {LINES.slice(0, lineIdx).map((line, i) => (
            <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={i === 0 ? 'text-2xl font-bold' : 'text-muted-foreground'}>
              {line}
            </motion.p>
          ))}
          {lineIdx < LINES.length && (
            <p className={lineIdx === 0 ? 'text-2xl font-bold' : 'text-muted-foreground'}>
              {LINES[lineIdx].slice(0, charIdx)}
              <span className="animate-pulse">|</span>
            </p>
          )}
        </div>

        <AnimatePresence>
          {done && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Button onClick={onDone} size="lg" className="gap-2">
                <Sparkles className="w-4 h-4" /> Let's go!
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const QUICK_LINKS = [
  {
    href: '/campaigns/new',
    label: 'New Campaign',
    desc: 'Compose & send a rich email campaign',
    icon: Plus,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'hover:border-primary/40 hover:bg-primary/5',
    cta: 'Create',
  },
  {
    href: '/campaigns/history',
    label: 'Campaign History',
    desc: 'View sent campaigns & per-email results',
    icon: History,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'hover:border-blue-400/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
    cta: 'View',
  },
  {
    href: '/campaigns/automation',
    label: 'Automation',
    desc: 'Schedule & manage automated campaigns',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'hover:border-amber-400/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
    cta: 'Manage',
  },
];

export function CampaignsPage() {
  const [, navigate] = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(WELCOME_KEY)) {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeDone = () => {
    localStorage.setItem(WELCOME_KEY, '1');
    setShowWelcome(false);
  };

  return (
    <>
      <AnimatePresence>{showWelcome && <WelcomeScreen onDone={handleWelcomeDone} />}</AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto space-y-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground mt-1">Your email marketing hub</p>
          </div>
          <Button onClick={() => navigate('/campaigns/new')} className="gap-2">
            <Plus className="w-4 h-4" /> New Campaign
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map(({ href, label, desc, icon: Icon, color, bg, border, cta }) => (
            <Link key={href} href={href}>
              <a className={`flex flex-col gap-3 p-5 rounded-xl border border-border transition-all cursor-pointer ${border}`}>
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <span className={`text-xs font-medium flex items-center gap-1 ${color}`}>
                  {cta} <ArrowRight className="w-3 h-3" />
                </span>
              </a>
            </Link>
          ))}
        </div>

        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Send className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Ready to reach your audience?</p>
              <p className="text-sm text-muted-foreground mt-1">Create a campaign with rich formatting, AI content, and track every send.</p>
            </div>
            <Button onClick={() => navigate('/campaigns/new')} variant="outline" className="gap-2">
              <Sparkles className="w-4 h-4" /> Start New Campaign
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
