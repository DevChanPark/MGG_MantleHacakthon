import React, { useState } from 'react';
import mggLogo from '../../assets/brand/mgg-logo.png';

interface HeaderProps {
  isNotificationOpen?: boolean;
  hasUnreadNotifications?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onNotificationClick?: () => void;
}

export function Header({
  isNotificationOpen = false,
  hasUnreadNotifications = false,
  searchTerm = '',
  onSearchChange,
  onNotificationClick,
}: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const closeSearch = () => {
    setIsSearchOpen(false);
    onSearchChange?.('');
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-logo" aria-label="MGG">
          <img className="header-logo-img" src={mggLogo} alt="" aria-hidden="true" />
        </h1>
      </div>

      <div className="header-actions">
        <button
          className="header-icon-btn"
          type="button"
          aria-label="Search"
          aria-expanded={isSearchOpen}
          onClick={() => setIsSearchOpen((isOpen) => !isOpen)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>
        </button>
        <button
          className={`header-icon-btn notification-trigger${isNotificationOpen ? ' is-active' : ''}${hasUnreadNotifications ? ' has-unread' : ''}`}
          type="button"
          aria-label="Notifications"
          aria-expanded={isNotificationOpen}
          onClick={onNotificationClick}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 9a6 6 0 0 0-12 0c0 4.3-1.6 6.4-2.6 7.5-.5.5-.1 1.5.7 1.5h15.8c.8 0 1.2-1 .7-1.5C19.6 15.4 18 13.3 18 9Z" />
            <path d="M14.5 20a2.8 2.8 0 0 1-5 0" />
          </svg>
        </button>
      </div>

      {isSearchOpen && (
        <div className="header-search-panel" role="search">
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange?.(event.target.value)}
            autoFocus
            placeholder="Search bad takes"
            aria-label="Search battles"
          />
          <button type="button" onClick={closeSearch} aria-label="Close search">
            X
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;
