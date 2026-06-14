import React from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
  targetType: 'battle' | 'profile';
  battleId?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onNotificationSelect: (notification: NotificationItem) => void;
}

export function NotificationPanel({
  isOpen,
  notifications,
  onClose,
  onNotificationSelect,
}: NotificationPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <section className="notification-panel" aria-label="알림 목록">
      <div className="notification-panel-header">
        <h2>알림 ({notifications.length})</h2>
        <button type="button" aria-label="알림 닫기" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="notification-list">
        {notifications.map((notification) => (
          <button
            className={`notification-item${notification.isRead ? ' is-read' : ' is-unread'}`}
            key={notification.id}
            type="button"
            onClick={() => onNotificationSelect(notification)}
          >
            <span className="notification-unread-dot" aria-hidden="true" />
            <span className="notification-copy">
              <strong>{notification.title}</strong>
              <span>{notification.body}</span>
              <small>{notification.time}</small>
            </span>
            <span className="notification-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default NotificationPanel;
