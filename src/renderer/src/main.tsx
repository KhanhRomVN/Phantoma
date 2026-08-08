import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// --- Performance Profiling Tools (Development Only) ---
if (process.env.NODE_ENV === 'development') {
  // NOTE: why-did-you-render temporarily disabled due to hooks conflict with React Router v6 + React 19
  // Track issue: https://github.com/welldone-software/why-did-you-render/issues/xxx
  // 1. why-did-you-render - detect unnecessary re-renders (DISABLED)
  // import('@welldone-software/why-did-you-render').then((module) => {
  //   const whyDidYouRender = module.default || module;
  //   whyDidYouRender(React, {
  //     trackAllPureComponents: true,
  //     trackHooks: true,
  //     logOnDifferentValues: true,
  //   });
  // });

  // 2. react-scan - automatically detect performance issues
  import('react-scan').then((module) => {
    module.scan({
      enabled: true,
      log: true,
    });
  });
}
// 3. Web Vitals - measure core web vitals (CLS, INP, LCP, FCP, TTFB)
if (import.meta.env.PROD) {
  import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
    onCLS(console.log);
    onINP(console.log);
    onLCP(console.log);
    onFCP(console.log);
    onTTFB(console.log);
  });
}

import { ThemeProvider } from './theme/ThemeProvider';
import { FontProvider } from './fonts';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="phantoma-theme">
        <FontProvider defaultFontId="google-sans">
          <App />
        </FontProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);