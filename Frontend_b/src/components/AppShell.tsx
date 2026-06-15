import React, { useState } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { BoardSelectSheet, type CreateBattleType } from './BoardSelectSheet';
import { NotificationPanel } from './NotificationPanel';

interface AppShellProps {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  hideHeader?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

type NotificationTargetType = 'battle' | 'profile';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
  targetType: NotificationTargetType;
  battleId?: string;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notification-comment-sauce',
    title: 'Reply Alert',
    body: 'A fresh reply landed in a pick-a-side battle.',
    time: 'just now',
    isRead: false,
    targetType: 'battle',
    battleId: 'battle-option-sauce',
  },
  {
    id: 'notification-result-dawn',
    title: 'AI Verdict Alert',
    body: 'The tiny gavel has finished overthinking.',
    time: '12 min ago',
    isRead: false,
    targetType: 'battle',
    battleId: 'battle-open-dawn',
  },
  {
    id: 'notification-credit',
    title: 'Credit Alert',
    body: 'Your demo credit trail is hiding in Profile.',
    time: '1 hr ago',
    isRead: true,
    targetType: 'profile',
  },
];

export function AppShell({
  children,
  overlay,
  hideHeader = false,
  searchTerm = '',
  onSearchChange,
}: AppShellProps) {
  const [isBoardSheetOpen, setIsBoardSheetOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const hasUnreadNotifications = notifications.some((notification) => !notification.isRead);

  const handleBattleTypeSelect = (battleType: CreateBattleType) => {
    window.sessionStorage.setItem('mgg:selectedBattleType', battleType);
    setIsBoardSheetOpen(false);
    window.location.hash = `create/${battleType}`;
  };

  const handleNotificationSelect = (notification: AppNotification) => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((currentNotification) =>
        currentNotification.id === notification.id ? { ...currentNotification, isRead: true } : currentNotification,
      ),
    );
    setIsNotificationOpen(false);

    if (notification.targetType === 'profile') {
      window.location.hash = 'profile';
      return;
    }

    if (notification.battleId) {
      window.location.hash = `battle/${notification.battleId}`;
    }
  };

  return (
    <div className={`app-shell${hideHeader ? ' app-shell-no-header' : ''}`}>
      {!hideHeader && (
        <>
          <Header
            isNotificationOpen={isNotificationOpen}
            hasUnreadNotifications={hasUnreadNotifications}
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            onNotificationClick={() => setIsNotificationOpen((isOpen) => !isOpen)}
          />
          <NotificationPanel
            isOpen={isNotificationOpen}
            notifications={notifications}
            onClose={() => setIsNotificationOpen(false)}
            onNotificationSelect={handleNotificationSelect}
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
