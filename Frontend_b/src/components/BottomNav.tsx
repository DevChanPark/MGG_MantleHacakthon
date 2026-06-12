import React from 'react';

export function BottomNav() {
  const handleNavClick = (route: string) => {
    window.location.hash = route;
  };

  return (
    <nav className="app-bottom-nav">
      <button
        className="bottom-nav-item"
        onClick={() => handleNavClick('home')}
        aria-label="Home"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
        </svg>
        <span className="nav-label">홈</span>
      </button>

      <button
        className="bottom-nav-center"
        onClick={() => handleNavClick('create')}
        aria-label="Create"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <button
        className="bottom-nav-item"
        onClick={() => handleNavClick('profile')}
        aria-label="Profile"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
        </svg>
        <span className="nav-label">프로필</span>
      </button>
    </nav>
  );
}

export default BottomNav;
