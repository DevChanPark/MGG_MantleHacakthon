import React from 'react';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: '@welcome님의 게시글',
    body: '@welcome의 게시글에서 우승자로 선정되었습니다.',
  },
  {
    id: 'n2',
    title: '@welcome님이 참여했습니다.',
    body: '@welcome님이 참여했습니다.',
  },
  {
    id: 'n3',
    title: '@welcome님의 게시글',
    body: '@welcome의 게시글에서 우승자로 선정되었습니다.',
  },
  {
    id: 'n4',
    title: '@welcome님이 참여했습니다.',
    body: '@welcome님이 참여했습니다.',
  },
];

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <section className="notification-panel" aria-label="알림 목록">
      <div className="notification-panel-header">
        <h2>알림 ({MOCK_NOTIFICATIONS.length})</h2>
        <button type="button" aria-label="알림 닫기" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="notification-list">
        {MOCK_NOTIFICATIONS.map((notification) => (
          <article className="notification-item" key={notification.id}>
            <div>
              <h3>{notification.title}</h3>
              <p>{notification.body}</p>
            </div>
            <button type="button" aria-label={`${notification.title} 열기`}>
              ↪
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default NotificationPanel;
