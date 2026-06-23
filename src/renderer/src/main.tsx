import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
