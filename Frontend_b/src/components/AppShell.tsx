import React, { useState } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { BoardSelectSheet, type CreateBattleType } from './BoardSelectSheet';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isBoardSheetOpen, setIsBoardSheetOpen] = useState(false);

  const handleBattleTypeSelect = (battleType: CreateBattleType) => {
    window.sessionStorage.setItem('mgg:selectedBattleType', battleType);
    setIsBoardSheetOpen(false);
    window.location.hash = 'create';
  };

  return (
    <div className="app-shell">
      <Header />

      <div className="app-content">
        {children}
      </div>

      <BottomNav onCreateClick={() => setIsBoardSheetOpen(true)} />
      <BoardSelectSheet
        isOpen={isBoardSheetOpen}
        onClose={() => setIsBoardSheetOpen(false)}
        onSelect={handleBattleTypeSelect}
      />
    </div>
  );
}

export default AppShell;
