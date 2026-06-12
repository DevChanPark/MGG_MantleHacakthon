import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Header />
      
      <div className="app-content">
        {children}
      </div>
      
      <BottomNav />
    </div>
  );
}

export default AppShell;
