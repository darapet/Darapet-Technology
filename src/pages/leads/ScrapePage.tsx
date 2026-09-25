import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Legacy compatibility route.
 *
 * Lead scraping used to call a hosted Replit endpoint. The GitHub Pages app
 * now keeps scouting in the user's Supabase-backed workspace instead.
 */
export function ScrapePage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/scouting');
  }, [setLocation]);

  return null;
}