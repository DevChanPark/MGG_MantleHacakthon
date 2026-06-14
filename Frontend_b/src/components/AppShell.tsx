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
    title: '댓글 알림',
    body: '선택지형 배틀에 새 댓글이 달렸습니다.',
    time: '방금 전',
    isRead: false,
    targetType: 'battle',
    battleId: 'battle-option-sauce',
  },
  {
    id: 'notification-result-dawn',
    title: 'AI 결과 알림',
    body: 'AI 평가 결과를 확인할 수 있습니다.',
    time: '12분 전',
    isRead: false,
    targetType: 'battle',
    battleId: 'battle-open-dawn',
  },
  {
    id: 'notification-credit',
    title: '크레딧 알림',
    body: '크레딧 내역을 프로필에서 확인해보세요.',
    time: '1시간 전',
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
