import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import GuestBanner from '../components/layout/GuestBanner';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="md:pl-64">
        <TopBar onMenu={() => setMenuOpen(true)} />
        <GuestBanner />
        <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
