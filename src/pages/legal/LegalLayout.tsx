import type { ReactNode } from 'react';

type LegalLayoutProps = {
  title: string;
  intro: string;
  children: ReactNode;
};

export function LegalLayout({ title, intro, children }: LegalLayoutProps) {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const homeUrl = baseUrl;
  const privacyUrl = normalizedBaseUrl + 'privacy';
  const termsUrl = normalizedBaseUrl + 'terms';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <nav className="flex items-center justify-between" aria-label="Legal navigation">
          <a href={homeUrl} className="flex items-center gap-2 font-semibold tracking-tight text-slate-950 hover:text-blue-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-sm font-bold text-white shadow-lg shadow-blue-600/20">D</span>
            Darapet
          </a>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <a href={privacyUrl} className="transition-colors hover:text-blue-700">Privacy</a>
            <a href={termsUrl} className="transition-colors hover:text-blue-700">Terms</a>
          </div>
        </nav>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-xl shadow-slate-200/50 sm:px-12 sm:py-12">
          <header className="border-b border-slate-200 pb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Darapet Technology</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{intro}</p>
            <p className="mt-4 text-sm text-slate-500">Last updated: September 26, 2026</p>
          </header>

          <article className="prose prose-slate mt-8 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-slate-950 prose-a:text-blue-700 prose-a:no-underline hover:prose-a:underline">
            {children}
          </article>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 px-1 pt-6 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Darapet Technology</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href={privacyUrl} className="hover:text-blue-700">Privacy Policy</a>
            <a href={termsUrl} className="hover:text-blue-700">Terms and Conditions</a>
            <a href={homeUrl} className="hover:text-blue-700">Back to app</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
