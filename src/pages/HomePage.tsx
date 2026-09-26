import { useEffect } from 'react';
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, Search, ShieldCheck, Target, Users, Workflow } from 'lucide-react';

const basePath = import.meta.env.BASE_URL || '/';
const withRoute = (path: string) => (basePath.endsWith('/') ? basePath : basePath + '/') + path;

const features = [
  {
    icon: Users,
    title: 'Organize your leads',
    description: 'Keep contacts, notes, and outreach details together so you always know who to contact next.',
  },
  {
    icon: Workflow,
    title: 'Plan campaigns',
    description: 'Create focused campaigns, manage follow-ups, and keep your outreach work moving in one place.',
  },
  {
    icon: Search,
    title: 'Scout prospects',
    description: 'Research and collect promising prospects before you add them to a campaign or workflow.',
  },
  {
    icon: Mail,
    title: 'Send with Gmail',
    description: 'Connect Gmail to send messages you choose, while keeping campaign context close at hand.',
  },
];

export function HomePage() {
  useEffect(() => {
    document.title = 'dearapet lead engine';
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -left-48 top-24 h-[32rem] w-[32rem] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-48 top-[32rem] h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-[120px]" />

      <div className="relative">
        <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <a href={basePath} className="flex items-center gap-3" aria-label="dearapet lead engine home">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 text-lg font-bold shadow-lg shadow-blue-600/25">D</span>
              <span className="text-sm font-semibold tracking-tight sm:text-base">dearapet lead engine</span>
            </a>
            <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex" aria-label="Primary navigation">
              <a href="#features" className="transition-colors hover:text-white">What it does</a>
              <a href="#data-use" className="transition-colors hover:text-white">Data use</a>
              <a href={withRoute('privacy')} className="transition-colors hover:text-white">Privacy Policy</a>
              <a href={withRoute('terms')} className="transition-colors hover:text-white">Terms</a>
            </nav>
            <a href={withRoute('login')} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-400/60 hover:bg-white/10">Sign in</a>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Lead management and outreach workspace
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl sm:leading-[1.05]">
              Make every lead and follow-up easier to manage.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              <strong className="font-semibold text-white">dearapet lead engine</strong> helps you organize prospects, build campaigns, scout opportunities, and send thoughtful outreach from one focused workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={withRoute('register')} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white shadow-xl shadow-blue-600/25 transition-all hover:bg-blue-400">
                Get started <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#data-use" className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-slate-200 transition-colors hover:bg-white/10">See how data is used</a>
            </div>
            <p className="mt-5 text-sm text-slate-500">You can read this overview and our policies without creating an account.</p>
          </div>

          <div className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-blue-950/30 backdrop-blur-xl sm:p-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-300">Workspace overview</p>
                  <h2 className="mt-2 text-xl font-semibold">Your outreach, in context</h2>
                </div>
                <Target className="h-7 w-7 text-blue-400" />
              </div>
              <div className="grid gap-3 py-5 sm:grid-cols-3">
                <div className="rounded-xl bg-white/[0.06] p-4"><p className="text-2xl font-bold">24</p><p className="mt-1 text-xs text-slate-400">Active leads</p></div>
                <div className="rounded-xl bg-white/[0.06] p-4"><p className="text-2xl font-bold">08</p><p className="mt-1 text-xs text-slate-400">Campaigns</p></div>
                <div className="rounded-xl bg-white/[0.06] p-4"><p className="text-2xl font-bold">12</p><p className="mt-1 text-xs text-slate-400">Follow-ups</p></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300"><Users className="h-4 w-4" /></span><div className="flex-1"><p className="text-sm font-medium">Review new prospects</p><p className="text-xs text-slate-500">Scouting queue</p></div><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300"><Mail className="h-4 w-4" /></span><div className="flex-1"><p className="text-sm font-medium">Prepare campaign follow-up</p><p className="text-xs text-slate-500">Campaign workspace</p></div><span className="h-2 w-2 rounded-full bg-amber-400" /></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">What the app does</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">One place for the work between finding a lead and building a relationship.</h2><p className="mt-4 leading-7 text-slate-400">dearapet lead engine gives you a practical workflow for turning scattered prospect information into organized, reviewable outreach.</p></div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300"><Icon className="h-5 w-5" /></div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="data-use" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><ShieldCheck className="h-6 w-6" /></div><h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Clear about the data we request.</h2><p className="mt-4 leading-7 text-slate-400">The app requests information only to provide the workflow you choose to use. Connecting Gmail is optional and is not required to read this homepage or our policies.</p></div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex gap-4"><LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-blue-300" /><div><h3 className="font-semibold">Account and workspace information</h3><p className="mt-2 text-sm leading-6 text-slate-400">We use your name, email, preferences, leads, contacts, campaigns, and related content to create your account and deliver the features you request.</p></div></div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex gap-4"><Mail className="mt-1 h-5 w-5 shrink-0 text-blue-300" /><div><h3 className="font-semibold">Gmail access is for requested email features</h3><p className="mt-2 text-sm leading-6 text-slate-400">If you connect Gmail, the app uses the approved Google permissions to support email features you request, including sending messages on your behalf when you instruct it. We do not ask for your Google password.</p></div></div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex gap-4"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-blue-300" /><div><h3 className="font-semibold">No selling or advertising use</h3><p className="mt-2 text-sm leading-6 text-slate-400">We do not sell Gmail data, use it for advertising, transfer it to data brokers, or use it to train general-purpose AI models. You can disconnect Gmail or revoke access at any time.</p></div></div></div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8"><div className="rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/15 to-indigo-500/10 p-8 sm:p-10"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Read before you connect</p><h2 className="mt-3 text-2xl font-bold">Your access, choices, and responsibilities are explained clearly.</h2></div><div className="flex flex-wrap gap-3"><a href={withRoute('privacy')} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-blue-50">Privacy Policy</a><a href={withRoute('terms')} className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Terms and Conditions</a></div></div></div></section>

        <footer className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><p className="font-semibold text-slate-300">dearapet lead engine</p><p className="mt-1">A lead management and outreach workspace by Darapet Technology.</p></div><div className="flex flex-wrap gap-x-5 gap-y-2"><a href={withRoute('privacy')} className="hover:text-white">Privacy Policy</a><a href={withRoute('terms')} className="hover:text-white">Terms</a><a href={withRoute('login')} className="hover:text-white">Sign in</a></div></div></footer>
      </div>
    </main>
  );
}
