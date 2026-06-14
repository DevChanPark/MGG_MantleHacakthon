import { type MouseEvent, type ReactNode, useEffect, useState } from 'react';
import metamaskLogo from '../../assets/image13.png';
import okxLogo from '../../assets/image14.png';
import walletConnectLogo from '../../assets/image15.png';
import mggLogo from '../../assets/brand/mgg-logo.png';
import mugigWordmark from '../../assets/brand/mugig-wordmark.png';
import commentCard from '../../assets/ui/group-35.png';
import likeBubble from '../../assets/ui/group-36.png';
import commentBubble from '../../assets/ui/group-37.png';
import typeOpenCard from '../../assets/ui/group-42.png';
import typeOptionCard from '../../assets/ui/group-43.png';
import typeImageCard from '../../assets/ui/group-44.png';
import judgeHammer from '../../assets/ui/group-45.png';
import resultCard from '../../assets/ui/group-46.png';
import shareIcon from '../../assets/ui/union.png';

const frame = {
  width: 402,
  height: 874,
};

const AUTO_SLIDE_INTERVAL_MS = 3000;
const MIN_SWIPE_DISTANCE = 48;

const loginWalletOptions = [
  {
    iconSrc: metamaskLogo,
    iconClassName: 'metamask-logo',
    strongLabel: 'MetaMask',
    suffix: '로 로그인하기',
  },
  {
    iconSrc: okxLogo,
    iconClassName: 'okx-logo',
    strongLabel: 'OKX Wallet',
    suffix: '으로 로그인하기',
  },
  {
    iconSrc: walletConnectLogo,
    iconClassName: 'walletconnect-logo',
    strongLabel: 'WalletConnect',
    suffix: '로 로그인하기',
  },
];

const onboardingPages = [
  {
    id: 'mugig',
    kind: 'logo',
    source: mugigWordmark,
    alt: 'MuGiG!',
    logoWidth: 279,
    logoHeight: 61.15115737915039,
    logoLeft: 61,
    logoTop: 406,
  },
  {
    id: 'mgg',
    kind: 'logo',
    source: mggLogo,
    alt: 'MGG',
    logoWidth: 182.927734375,
    logoHeight: 58.125,
    logoLeft: 110,
    logoTop: 408,
  },
  {
    id: 'welcome',
    kind: 'welcome',
  },
  {
    id: 'type-select',
    kind: 'type-select',
  },
  {
    id: 'ai-judge',
    kind: 'ai-judge',
  },
  {
    id: 'share-result',
    kind: 'share-result',
  },
] as const;

const carouselPages = onboardingPages.slice(2);

export function OnboardingFeed(props: OnboardingFeedProps) {
  const [requestedPageId, setRequestedPageId] = useState(() => getRequestedPageId());
  const requestedPageIndex = onboardingPages.findIndex((page) => page.id === requestedPageId);
  const hasRequestedPage = requestedPageIndex !== -1;

  useEffect(() => {
    const handleHashChange = () => setRequestedPageId(getRequestedPageId());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!hasRequestedPage) {
    return <AutoOnboardingCarousel {...props} />;
  }

  const page = onboardingPages[requestedPageIndex];

  return (
    <main className="onboarding-feed" aria-label="MGG onboarding feed">
      <OnboardingPageShell page={page}>{renderPage(page, true, props)}</OnboardingPageShell>
    </main>
  );
}

function AutoOnboardingCarousel({ isWalletConnecting, walletError, onWalletConnect }: OnboardingFeedProps) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  // Auto slide logic: advances every 3 seconds, loops after the last page,
  // and restarts naturally whenever activePageIndex changes after a swipe.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActivePageIndex((pageIndex) => getWrappedPageIndex(pageIndex + 1, carouselPages.length));
    }, AUTO_SLIDE_INTERVAL_MS);

    return () => window.clearTimeout(timeoutId);
  }, [activePageIndex]);

  const handleSwipeEnd = (clientX: number) => {
    if (dragStartX === null) {
      return;
    }

    const swipeDistance = clientX - dragStartX;

    if (Math.abs(swipeDistance) >= MIN_SWIPE_DISTANCE) {
      setActivePageIndex((pageIndex) => getWrappedPageIndex(pageIndex + (swipeDistance < 0 ? 1 : -1), carouselPages.length));
    }

    setDragStartX(null);
  };

  return (
    <main className="onboarding-feed" aria-label="MGG onboarding feed">
      <div
        className="onboarding-carousel-frame"
        aria-roledescription="carousel"
        aria-label="MGG onboarding carousel"
      >
        <div className="fixed-onboarding-hero" aria-hidden="true" />
        <img className="app-logo-small" src={mggLogo} alt="MGG" />

        <div
          className="onboarding-fixed-content-viewport"
          onPointerCancel={() => setDragStartX(null)}
          onPointerDown={(event) => setDragStartX(event.clientX)}
          onPointerLeave={() => setDragStartX(null)}
          onPointerUp={(event) => handleSwipeEnd(event.clientX)}
        >
          <div
            className="onboarding-fixed-content-track"
            style={{ transform: `translate3d(-${activePageIndex * 100}%, 0, 0)` }}
          >
            {carouselPages.map((page) => (
              <section className="onboarding-fixed-content-slide" id={page.id} key={page.id} aria-label={getPageLabel(page)}>
                {renderCarouselContent(page)}
              </section>
            ))}
          </div>
        </div>

        <PageDots activeIndex={activePageIndex} />
        <AuthActions
          isWalletConnecting={isWalletConnecting}
          walletError={walletError}
          onWalletConnect={onWalletConnect}
        />
      </div>
    </main>
  );
}

function getRequestedPageId() {
  return window.location.hash.replace('#', '');
}

type LogoPageProps = {
  page: (typeof onboardingPages)[0] | (typeof onboardingPages)[1];
};

type OnboardingPage = (typeof onboardingPages)[number];

type AuthPageProps = {
  showActions?: boolean;
  isWalletConnecting?: boolean;
  walletError?: string;
  onWalletConnect?: (walletProvider: string) => Promise<void>;
};

type OnboardingFeedProps = Omit<AuthPageProps, 'showActions'>;

function getWrappedPageIndex(pageIndex: number, pageCount: number) {
  return (pageIndex + pageCount) % pageCount;
}

function getPageLabel(page: OnboardingPage) {
  return page.kind === 'logo'
    ? page.alt
    : page.kind === 'welcome'
      ? 'MGG welcome'
      : page.kind === 'type-select'
        ? 'MGG battle type select'
        : page.kind === 'ai-judge'
          ? 'MGG AI judge'
          : 'MGG share result';
}

function renderPage(page: OnboardingPage, showActions: boolean, authProps: OnboardingFeedProps = {}) {
  return page.kind === 'welcome' ? (
    <WelcomePage showActions={showActions} {...authProps} />
  ) : page.kind === 'type-select' ? (
    <TypeSelectPage showActions={showActions} {...authProps} />
  ) : page.kind === 'ai-judge' ? (
    <AiJudgePage showActions={showActions} {...authProps} />
  ) : page.kind === 'share-result' ? (
    <ShareResultPage showActions={showActions} {...authProps} />
  ) : (
    <LogoPage page={page} />
  );
}

function renderCarouselContent(page: OnboardingPage) {
  return page.kind === 'welcome' ? (
    <WelcomeContent />
  ) : page.kind === 'type-select' ? (
    <TypeSelectContent />
  ) : page.kind === 'ai-judge' ? (
    <AiJudgeContent />
  ) : page.kind === 'share-result' ? (
    <ShareResultContent />
  ) : null;
}

type OnboardingPageShellProps = {
  children: ReactNode;
  page: OnboardingPage;
};

function OnboardingPageShell({ children, page }: OnboardingPageShellProps) {
  return (
    <section className="onboarding-page" id={page.id} aria-label={getPageLabel(page)}>
      {children}
    </section>
  );
}

function LogoPage({ page }: LogoPageProps) {
  return (
    <div className="onboarding-frame">
      <img
        className="onboarding-logo"
        src={page.source}
        alt={page.alt}
        style={{
          width: `${(page.logoWidth / frame.width) * 100}%`,
          height: `${(page.logoHeight / frame.height) * 100}%`,
          left: `${(page.logoLeft / frame.width) * 100}%`,
          top: `${(page.logoTop / frame.height) * 100}%`,
        }}
      />
    </div>
  );
}

function WelcomePage({ showActions = true, isWalletConnecting, walletError, onWalletConnect }: AuthPageProps) {
  return (
    <div className="welcome-frame">
      <div className="welcome-hero" aria-hidden="true" />
      <img className="app-logo-small" src={mggLogo} alt="MGG" />
      <WelcomeContent />

      <PageDots activeIndex={0} />

      {showActions ? (
        <AuthActions
          isWalletConnecting={isWalletConnecting}
          walletError={walletError}
          onWalletConnect={onWalletConnect}
        />
      ) : null}
    </div>
  );
}

function WelcomeContent() {
  return (
    <>
      <h1 className="welcome-title">
        MGG에 오신 것을
        <br />
        환영합니다!
      </h1>

      <div className="welcome-art" aria-hidden="true">
        <img className="welcome-comment-card" src={commentCard} alt="" />
        <img className="welcome-like-bubble" src={likeBubble} alt="" />
        <img className="welcome-comment-bubble" src={commentBubble} alt="" />
        <img className="welcome-logo-large" src={mggLogo} alt="" />
      </div>
    </>
  );
}

function TypeSelectPage({ showActions = true, isWalletConnecting, walletError, onWalletConnect }: AuthPageProps) {
  return (
    <div className="welcome-frame type-select-frame">
      <div className="type-select-hero" aria-hidden="true" />
      <img className="app-logo-small" src={mggLogo} alt="MGG" />

      <TypeSelectContent />

      <PageDots activeIndex={1} />
      {showActions ? (
        <AuthActions
          isWalletConnecting={isWalletConnecting}
          walletError={walletError}
          onWalletConnect={onWalletConnect}
        />
      ) : null}
    </div>
  );
}

function TypeSelectContent() {
  return (
    <>
      <div className="type-select-cards" aria-label="배틀 유형 선택">
        <img className="type-card type-card-open" src={typeOpenCard} alt="오픈 답변형" />
        <img className="type-card type-card-option" src={typeOptionCard} alt="선택지형" />
        <img className="type-card type-card-image" src={typeImageCard} alt="이미지형" />
      </div>

      <h1 className="type-select-title">
        유형을 선택하고,
        <br />
        다양한 의견을 나눠보세요
      </h1>
    </>
  );
}

function AiJudgePage({ showActions = true, isWalletConnecting, walletError, onWalletConnect }: AuthPageProps) {
  return (
    <div className="welcome-frame ai-judge-frame">
      <div className="ai-judge-hero" aria-hidden="true" />
      <img className="app-logo-small" src={mggLogo} alt="MGG" />

      <AiJudgeContent />

      <PageDots activeIndex={2} />
      {showActions ? (
        <AuthActions
          isWalletConnecting={isWalletConnecting}
          walletError={walletError}
          onWalletConnect={onWalletConnect}
        />
      ) : null}
    </div>
  );
}

function AiJudgeContent() {
  return (
    <>
      <h1 className="ai-judge-title">판단은 AI가!</h1>
      <img className="ai-judge-hammer" src={judgeHammer} alt="" aria-hidden="true" />
    </>
  );
}

function ShareResultPage({ showActions = true, isWalletConnecting, walletError, onWalletConnect }: AuthPageProps) {
  return (
    <div className="welcome-frame share-result-frame">
      <div className="share-result-hero" aria-hidden="true" />
      <img className="app-logo-small" src={mggLogo} alt="MGG" />

      <ShareResultContent />

      <PageDots activeIndex={3} />
      {showActions ? (
        <AuthActions
          isWalletConnecting={isWalletConnecting}
          walletError={walletError}
          onWalletConnect={onWalletConnect}
        />
      ) : null}
    </div>
  );
}

function ShareResultContent() {
  return (
    <>
      <img className="share-result-card" src={resultCard} alt="" aria-hidden="true" />
      <img className="share-result-icon" src={shareIcon} alt="" aria-hidden="true" />

      <h1 className="share-result-title">
        결과는 기록으로 남아요
        <br />
        친구들과 공유해봐요!
      </h1>
    </>
  );
}

type PageDotsProps = {
  activeIndex: number;
};

function PageDots({ activeIndex }: PageDotsProps) {
  return (
    <div className="welcome-dots" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <span className={`welcome-dot${activeIndex === index ? ' is-active' : ''}`} key={index} />
      ))}
    </div>
  );
}

function AuthActions({ isWalletConnecting = false, walletError = '', onWalletConnect }: OnboardingFeedProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const openSignupFeed = () => {
    window.location.hash = 'signup';
  };

  return (
    <div className="welcome-actions">
      <button className="welcome-button" type="button" onClick={() => setIsLoginOpen(true)}>
        로그인하기
      </button>
      <button className="welcome-button" type="button" onClick={openSignupFeed}>
        회원가입하기
      </button>
      <p className="welcome-terms">
        계정을 생성하거나 로그인하면 당사의 <a href="#terms">이용약관(EULA)</a> 및{' '}
        <a href="#privacy">개인정보 처리 방침</a>에 동의하는 것으로 간주됩니다.
      </p>
      {isLoginOpen ? (
        <LoginModal
          isWalletConnecting={isWalletConnecting}
          walletError={walletError}
          onWalletConnect={onWalletConnect}
          onClose={() => setIsLoginOpen(false)}
        />
      ) : null}
    </div>
  );
}

type LoginModalProps = {
  onClose: () => void;
  isWalletConnecting?: boolean;
  walletError?: string;
  onWalletConnect?: (walletProvider: string) => Promise<void>;
};

function LoginModal({ onClose, isWalletConnecting = false, walletError = '', onWalletConnect }: LoginModalProps) {
  const closeOnBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="login-modal-layer" role="presentation" onMouseDown={closeOnBackdrop}>
      <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
        <h2 className="login-modal-title" id="login-modal-title">로그인하기</h2>
        <button className="login-modal-close" type="button" aria-label="로그인 팝업 닫기" onClick={onClose}>
          ×
        </button>

        <div className="login-wallet-options">
          {loginWalletOptions.map((option) => (
            <button
              className="login-wallet-button"
              type="button"
              key={option.strongLabel}
              disabled={isWalletConnecting}
              onClick={() => {
                if (!onWalletConnect) {
                  window.location.hash = 'signup';
                  return;
                }
                void onWalletConnect(option.strongLabel)
                  .then(() => {
                    onClose();
                    window.location.hash = 'home';
                  })
                  .catch(() => undefined);
              }}
            >
              <img
                className={`wallet-icon ${option.iconClassName}`}
                src={option.iconSrc}
                alt=""
                aria-hidden="true"
              />
              <span>
                <strong>{option.strongLabel}</strong>
                {option.suffix}
              </span>
            </button>
          ))}
        </div>
        {walletError ? <p className="login-wallet-error">{walletError}</p> : null}
      </section>
    </div>
  );
}
