/**
 * Desktop App Template - Main Router
 * Platform: Desktop (Large screens - Laptop, Desktop, Tablet landscape)
 */

import { useState } from 'react';
import { Dashboard } from './dashboard/Dashboard';
import { Settings } from './settings/Settings';
import { Sidebar } from './Sidebar';

type Page = 'dashboard' | 'settings';

export function DesktopTemplate() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'settings' && <Settings />}
      </main>
    </div>
  );
}
