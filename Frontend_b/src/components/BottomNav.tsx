import React from 'react';

export function BottomNav() {
  const handleNavClick = (route: string) => {
    window.location.hash = route;
  };

  return (
    <nav className="app-bottom-nav" aria-label="주요 메뉴">
      <button
        className="bottom-nav-item"
        onClick={() => handleNavClick('home')}
        type="button"
        aria-label="홈"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11.2 12 3l9 8.2v8.9c0 .5-.4.9-.9.9h-5.6v-6.3h-5V21H3.9a.9.9 0 0 1-.9-.9v-8.9Z" />
        </svg>
        <span className="nav-label">홈</span>
      </button>

      <button
        className="bottom-nav-center"
        onClick={() => handleNavClick('create')}
        type="button"
        aria-label="만들기"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v16M4 12h16" />
        </svg>
      </button>

      <button
        className="bottom-nav-item"
        onClick={() => handleNavClick('profile')}
        type="button"
        aria-label="프로필"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12.2a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2ZM4.4 21c.7-4.2 3.6-6.4 7.6-6.4s6.9 2.2 7.6 6.4H4.4Z" />
        </svg>
        <span className="nav-label">프로필</span>
      </button>
    </nav>
  );
}

export default BottomNav;
