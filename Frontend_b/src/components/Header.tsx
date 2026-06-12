import React from 'react';

interface HeaderProps {
  isNotificationOpen?: boolean;
  onNotificationClick?: () => void;
}

export function Header({ isNotificationOpen = false, onNotificationClick }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-logo" aria-label="MGG">
          MGG
        </h1>
      </div>

      <div className="header-actions">
        <button className="header-icon-btn" type="button" aria-label="검색">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>
        </button>
        <button
          className={`header-icon-btn notification-trigger${isNotificationOpen ? ' is-active' : ''}`}
          type="button"
          aria-label="알림"
          aria-expanded={isNotificationOpen}
          onClick={onNotificationClick}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 9a6 6 0 0 0-12 0c0 4.3-1.6 6.4-2.6 7.5-.5.5-.1 1.5.7 1.5h15.8c.8 0 1.2-1 .7-1.5C19.6 15.4 18 13.3 18 9Z" />
            <path d="M14.5 20a2.8 2.8 0 0 1-5 0" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default Header;
