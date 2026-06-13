import React, { useState } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { BoardSelectSheet, type CreateBattleType } from './BoardSelectSheet';
import { NotificationPanel } from './NotificationPanel';

interface AppShellProps {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  hideHeader?: boolean;
}

export function AppShell({ children, overlay, hideHeader = false }: AppShellProps) {
  const [isBoardSheetOpen, setIsBoardSheetOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const handleBattleTypeSelect = (battleType: CreateBattleType) => {
    window.sessionStorage.setItem('mgg:selectedBattleType', battleType);
    setIsBoardSheetOpen(false);
    window.location.hash = `create/${battleType}`;
  };

  return (
    <div className={`app-shell${hideHeader ? ' app-shell-no-header' : ''}`}>
      {!hideHeader && (
        <>
          <Header
            isNotificationOpen={isNotificationOpen}
            onNotificationClick={() => setIsNotificationOpen((isOpen) => !isOpen)}
          />
          <NotificationPanel
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
          />
        </>
      )}

      <div className="app-content">
        {children}
      </div>

      <BottomNav onCreateClick={() => setIsBoardSheetOpen(true)} />
      {overlay}
      <BoardSelectSheet
        isOpen={isBoardSheetOpen}
        onClose={() => setIsBoardSheetOpen(false)}
        onSelect={handleBattleTypeSelect}
      />
    </div>
  );
}

export default AppShell;
