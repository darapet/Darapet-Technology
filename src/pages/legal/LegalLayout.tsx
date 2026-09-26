import type { ReactNode } from 'react';

type LegalLayoutProps = {
  title: string;
  intro: string;
  children: ReactNode;
};

export function LegalLayout({ title, intro, children }: LegalLayoutProps) {
  const homeUrl = import.meta.env.BASE_URL;
  const privacyUrl = \`${import.meta.env.BASE_URL}privacy\`;
  const termsUrl = \`${import.meta.env.BASE_URL}terms\`;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <header className="mb-10 border-b border-slate-200 pb-8">
          <a href={homeUrl} className="text-sm font-semibold tracking-wide text-blue-700 hover:text-blue-900">
            Darapet
          </a>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{intro}</p>
          <p className="mt-4 text-sm text-slate-500">Last updated: September 26, 2026</p>
        </header>

        <article className="prose prose-slate max-w-none prose-headings:text-slate-950 prose-a:text-blue-700">
          {children}
        </article>

        <footer className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <a href={privacyUrl} className="hover:text-blue-700">Privacy Policy</a>
          <a href={termsUrl} className="hover:text-blue-700">Terms and Conditions</a>
          <a href={homeUrl} className="hover:text-blue-700">Back to Darapet</a>
        </footer>
      </div>
    </main>
  );
}
