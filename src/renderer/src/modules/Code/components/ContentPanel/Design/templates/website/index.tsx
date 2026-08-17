/**
 * Website Template - Main Router
 * Platform: Responsive Website (Desktop, Tablet, Mobile)
 * Theme: Light / Dark (Tailwind class strategy)
 */

import { useState } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './home/Home';
import { Features } from './features/Features';
import { Showcase } from './showcase/Showcase';
import { Pricing } from './pricing/Pricing';
import { About } from './about/About';
import { Contact } from './contact/Contact';

export type Page = 'home' | 'features' | 'showcase' | 'pricing' | 'about' | 'contact';

function WebsiteContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'features':
        return <Features onNavigate={setCurrentPage} />;
      case 'showcase':
        return <Showcase onNavigate={setCurrentPage} />;
      case 'pricing':
        return <Pricing onNavigate={setCurrentPage} />;
      case 'about':
        return <About onNavigate={setCurrentPage} />;
      case 'contact':
        return <Contact />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
      <Footer onNavigate={setCurrentPage} />
    </div>
  );
}

export function WebsiteTemplate() {
  return (
    <ThemeProvider>
      <WebsiteContent />
    </ThemeProvider>
  );
}
