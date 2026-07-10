import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';

// Layout
import Layout from '@/components/layout/Layout';
import ScrollToTop from '@/components/layout/ScrollToTop';

// Pages
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import ServicesPage from '@/pages/ServicesPage';
import ServiceCategoryPage from '@/pages/ServiceCategoryPage';
import SubServicePage from '@/pages/SubServicePage';
import PortfolioPage from '@/pages/PortfolioPage';
import PortfolioCategoryPage from '@/pages/PortfolioCategoryPage';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Switch location={location} key={location}>
        {/* Core */}
        <Route path="/" component={HomePage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        
        {/* Services */}
        <Route path="/services" component={ServicesPage} />
        <Route path="/services/:category" component={ServiceCategoryPage} />
        <Route path="/services/:category/:subservice" component={SubServicePage} />
        
        {/* Portfolio */}
        <Route path="/portfolio" component={PortfolioPage} />
        <Route path="/portfolio/:category" component={PortfolioCategoryPage} />
        
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ScrollToTop />
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
