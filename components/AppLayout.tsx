// components/AppLayout.tsx
'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
      />

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header onToggleMenu={() => setIsMenuOpen((prev) => !prev)} />
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}