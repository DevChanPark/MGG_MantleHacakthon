import { useEffect, useMemo, useState } from 'react';

import mggLogo from '../../assets/brand/mgg-logo.png';
import commentFilledIcon from '../../assets/profile-icons/comment-filled.png';
import commentOutlineIcon from '../../assets/profile-icons/comment-outline.png';
import heartFilledIcon from '../../assets/profile-icons/heart-filled.png';
import heartOutlineIcon from '../../assets/profile-icons/heart-outline.png';
import settingIcon from '../../assets/profile-icons/setting.png';
import stackIcon from '../../assets/profile-icons/stack.png';
import profileAvatar from '../../assets/profile-avatar.png';
import { ShareIcon } from '../components/icons/ShareIcon';
import {
  getWonBattlesForCurrentUser,
  initialMockBattles,
  MOCK_CURRENT_USER,
  type BattleType,
  type FeedBattle,
  type MantleVerification,
} from '../mocks/battles';

const profilePosts: Array<{
  type: BattleType;
  author: string;
  title: string;
  body: string[];
  comments: Array<{ author: string; text: string; likes: number; liked: boolean }>;
}> = [
  {
    type: 'TEXT_OPEN',
    author: 'Bad-Take Baron',
    title: 'Why Earth Is Obviously a Pancake',
    body: ['Counterarguments accepted, emotionally ignored.', 'AI is on my side because I said please.', 'Longer paragraphs look more correct. Science-ish.'],
    comments: [
      { author: 'Wallet Flatliner', text: 'If Earth is round, explain my flat bank account.', likes: 4, liked: true },
      { author: 'Tray Truther', text: 'The oceans stay put because Earth is a giant serving tray.', likes: 2, liked: false },
    ],
  },
  {
    type: 'TEXT_OPEN',
    author: '2AM Scholar',
    title: 'Why Deadlines Only Exist After Midnight',
    body: ['They hide all day, then arrive wearing a final-boss health bar.'],
    comments: [],
  },
];

type ProfileContentTab = 'posts' | 'comments' | 'wins';

const PROFILE_BATTLE_FILTERS: Array<{ label: string; value: BattleType }> = [
  { label: 'Open Mic', value: 'TEXT_OPEN' },
  { label: 'Side Pick', value: 'OPTION' },
  { label: 'Caption Lab', value: 'IMAGE_CAPTION' },
];

const battleTypeLabels: Record<BattleType, string> = {
  TEXT_OPEN: 'Open Mic',
  OPTION: 'Side Pick',
  IMAGE_CAPTION: 'Caption Lab',
};

export type CreditPackage = {
  credits: number;
  price: number;
};

export const creditPackages: CreditPackage[] = [
  { credits: 10, price: 10 },
  { credits: 30, price: 30 },
  { credits: 50, price: 50 },
  { credits: 100, price: 100 },
  { credits: 200, price: 200 },
  { credits: 300, price: 300 },
];

interface ProfileScreenProps {
  credits?: number;
  walletAddress?: string;
  battles?: FeedBattle[];
  onAddCredits?: (amount: number) => void;
}

export function ProfileScreen({
  credits = 30,
  walletAddress = '0x12ab...89ef',
  battles = initialMockBattles,
  onAddCredits,
}: ProfileScreenProps) {
  const [activeContentTab, setActiveContentTab] = useState<ProfileContentTab>('posts');
  const [activeBattleFilter, setActiveBattleFilter] = useState<BattleType>('TEXT_OPEN');
  const [currentCredits, setCurrentCredits] = useState(credits);
  const [isCreditPanelOpen, setIsCreditPanelOpen] = useState(false);
  const [isCreditInfoOpen, setIsCreditInfoOpen] = useState(false);
  const [selectedCreditPackage, setSelectedCreditPackage] = useState<CreditPackage | null>(null);
  const [completedCreditTotal, setCompletedCreditTotal] = useState<number | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<{
    battle: FeedBattle;
    verification: MantleVerification;
  } | null>(null);

  useEffect(() => {
    setCurrentCredits(credits);
  }, [credits]);

  const profileComments = useMemo(
    () =>
      profilePosts.flatMap((post) =>
        post.comments.map((comment) => ({
          ...comment,
          battleTitle: post.title,
        })),
      ),
    [],
  );

  const wonBattles = useMemo(
    () => getWonBattlesForCurrentUser(battles, MOCK_CURRENT_USER.id),
    [battles],
  );

  const filteredPosts = useMemo(
    () => profilePosts.filter((post) => post.type === activeBattleFilter),
    [activeBattleFilter],
  );

  const filteredWonBattles = useMemo(
    () => wonBattles.filter(({ battle }) => battle.type === activeBattleFilter),
    [activeBattleFilter, wonBattles],
  );

  const closeCreditPanel = () => {
    setIsCreditPanelOpen(false);
    setIsCreditInfoOpen(false);
    setSelectedCreditPackage(null);
  };

  const approveCreditPurchase = (creditPackage: CreditPackage) => {
    const nextCreditTotal = currentCredits + creditPackage.credits;
    setCurrentCredits(nextCreditTotal);
    onAddCredits?.(creditPackage.credits);
    closeCreditPanel();
    setCompletedCreditTotal(nextCreditTotal);
  };

  const openBattleDetail = (battleId: string) => {
    window.location.hash = `battle/${battleId}`;
  };

  const renderPosts = () => (
    <section className="profile-post-list" aria-label="My battles">
      {filteredPosts.length > 0 ? (
        filteredPosts.map((post, index) => (
          <article className="profile-post-card" key={post.title}>
            <div className="profile-post-avatar" aria-hidden="true" />
            <div className="profile-post-content">
              <p className="profile-post-author">{post.author}</p>
              <h2>{post.title}</h2>
              {post.body.map((line) => (
                <p className="profile-post-body" key={line}>{line}</p>
              ))}
            </div>

            <div className="profile-post-actions" aria-label="Battle reactions">
              <span><img className="profile-action-icon profile-action-comment" src={commentFilledIcon} alt="" aria-hidden="true" /> Replies {post.comments.length}</span>
              <span><img className="profile-action-icon profile-action-heart" src={heartFilledIcon} alt="" aria-hidden="true" /> Applause 24</span>
              <span><ShareIcon className="profile-action-icon profile-action-share share-action-icon" /> Share</span>
            </div>

            {index === 0 && post.comments.length > 0 ? (
              <div className="profile-comments-box">
                <p className="profile-comments-title">Replies {post.comments.length}</p>
                {post.comments.map((comment) => (
                  <div className="profile-comment-row" key={comment.author}>
                    <div className="profile-comment-avatar" aria-hidden="true" />
                    <div className="profile-comment-copy">
                      <p>{comment.author}</p>
                      <span>{comment.text}</span>
                    </div>
                    <div className="profile-comment-like">
                      <img
                        className="profile-comment-like-icon"
                        src={comment.liked ? heartFilledIcon : heartOutlineIcon}
                        alt=""
                        aria-hidden="true"
                      />
                      <span>{comment.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))
      ) : (
        <p className="profile-empty-state">No posts in this lane yet.</p>
      )}
    </section>
  );

  const renderComments = () => (
    <section className="profile-post-list" aria-label="My replies">
      {profileComments.map((comment) => (
        <article className="profile-comment-card" key={`${comment.battleTitle}-${comment.author}`}>
          <p className="profile-comments-title">{comment.battleTitle}</p>
          <div className="profile-comment-row">
            <div className="profile-comment-avatar" aria-hidden="true" />
            <div className="profile-comment-copy">
              <p>{comment.author}</p>
              <span>{comment.text}</span>
            </div>
            <div className="profile-comment-like">
              <img
                className="profile-comment-like-icon"
                src={comment.liked ? heartFilledIcon : heartOutlineIcon}
                alt=""
                aria-hidden="true"
              />
              <span>{comment.likes}</span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );

  const renderWins = () => (
    <section className="profile-post-list" aria-label="My won games">
      {filteredWonBattles.length > 0 ? (
        filteredWonBattles.map(({ battle, result }) => {
          const winningComment = battle.comments.find((comment) => comment.id === result.winnerCommentId);
          const verification = result.mantleVerification;

          return (
            <article className="profile-post-card profile-win-card" key={battle.id}>
              <div className="profile-post-avatar" aria-hidden="true" />
              <div className="profile-post-content">
                <div className="profile-win-kicker">
                  <span>Won</span>
                  <span>{battleTypeLabels[battle.type]}</span>
                </div>
                <p className="profile-post-author">{battle.author}</p>
                <h2>{battle.title}</h2>
                <p className="profile-post-body">{battle.description}</p>
              </div>

              <div className="profile-winning-comment-box">
                <span>My Winning Comment</span>
                <p>{winningComment?.text ?? result.winnerDetail}</p>
              </div>

              <div className="profile-win-actions">
                <button type="button" onClick={() => openBattleDetail(battle.id)}>
                  View All Replies
                </button>
                <button
                  className="profile-verify-button"
                  type="button"
                  onClick={() => setSelectedVerification({ battle, verification })}
                >
                  Mantle Verification
                </button>
              </div>
            </article>
          );
        })
      ) : (
        <p className="profile-empty-state">No trophies in this lane yet. Suspicious, but recoverable.</p>
      )}
    </section>
  );

  return (
    <main className="profile-feed" aria-label="MGG profile page">
      <section className="profile-frame">
        <header className="profile-header">
          <img className="app-logo-small" src={mggLogo} alt="MGG" />
          <button className="profile-settings-button" type="button" aria-label="Settings">
            <img className="profile-settings-icon" src={settingIcon} alt="" aria-hidden="true" />
          </button>
        </header>

        <div className="profile-scroll">
          <section className="profile-summary" aria-label="Profile summary">
            <img className="profile-avatar" src={profileAvatar} alt="" />
            <div className="profile-copy">
              <h1>Bad-Take Artist</h1>
              <p>Bad takes, clean receipts. Wallet-ready nonsense.</p>
            </div>
          </section>

          <button className="profile-edit-button" type="button">Edit Profile</button>

          <button className="profile-credit-row" type="button" onClick={() => setIsCreditPanelOpen(true)}>
            <span>My Demo Credits <strong>{currentCredits}</strong></span>
            <span>Refill</span>
          </button>

          <nav className="profile-content-tabs" aria-label="Profile content tabs">
            <button
              className={activeContentTab === 'posts' ? 'is-active' : ''}
              type="button"
              aria-label="My battles"
              aria-pressed={activeContentTab === 'posts'}
              onClick={() => setActiveContentTab('posts')}
            >
              <img className="profile-tab-icon-img profile-tab-stack-img" src={stackIcon} alt="" aria-hidden="true" />
            </button>
            <button
              className={activeContentTab === 'comments' ? 'is-active' : ''}
              type="button"
              aria-label="Replies"
              aria-pressed={activeContentTab === 'comments'}
              onClick={() => setActiveContentTab('comments')}
            >
              <img
                className="profile-tab-icon-img profile-tab-comment-img"
                src={activeContentTab === 'comments' ? commentFilledIcon : commentOutlineIcon}
                alt=""
                aria-hidden="true"
              />
            </button>
            <button
              className={activeContentTab === 'wins' ? 'is-active' : ''}
              type="button"
              aria-label="Won games"
              aria-pressed={activeContentTab === 'wins'}
              onClick={() => setActiveContentTab('wins')}
            >
              <span className="profile-tab-word">WIN</span>
            </button>
          </nav>

          <div className="profile-type-filters" aria-label="Battle type filters">
            {PROFILE_BATTLE_FILTERS.map((filter) => (
              <button
                className={activeBattleFilter === filter.value ? 'is-active' : ''}
                type="button"
                aria-pressed={activeBattleFilter === filter.value}
                onClick={() => setActiveBattleFilter(filter.value)}
                key={filter.value}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {activeContentTab === 'posts' && renderPosts()}
          {activeContentTab === 'comments' && renderComments()}
          {activeContentTab === 'wins' && renderWins()}
        </div>

        <CreditChargePanel
          isOpen={isCreditPanelOpen}
          isInfoOpen={isCreditInfoOpen}
          currentCredits={currentCredits}
          walletAddress={walletAddress}
          packages={creditPackages}
          selectedPackage={selectedCreditPackage}
          onClose={closeCreditPanel}
          onToggleInfo={() => setIsCreditInfoOpen((value) => !value)}
          onCloseInfo={() => setIsCreditInfoOpen(false)}
          onSelectPackage={setSelectedCreditPackage}
          onClosePayment={() => setSelectedCreditPackage(null)}
          onApprovePayment={approveCreditPurchase}
        />

        <CreditPurchaseCompleteModal
          creditTotal={completedCreditTotal}
          onClose={() => setCompletedCreditTotal(null)}
        />

        <MantleVerificationModal
          verification={selectedVerification?.verification ?? null}
          battleTitle={selectedVerification?.battle.title ?? ''}
          onClose={() => setSelectedVerification(null)}
        />

        <nav className="profile-bottom-nav" aria-label="Bottom navigation">
          <button type="button" aria-label="Home">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z" />
            </svg>
            <span>Home</span>
          </button>
          <button className="profile-create-button" type="button" aria-label="Create new battle" />
          <button type="button" aria-label="Profile">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="7" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0H4Z" />
            </svg>
            <span>Profile</span>
          </button>
        </nav>
      </section>
    </main>
  );
}

type MantleVerificationModalProps = {
  verification: MantleVerification | null;
  battleTitle: string;
  onClose: () => void;
};

function MantleVerificationModal({ verification, battleTitle, onClose }: MantleVerificationModalProps) {
  if (!verification) {
    return null;
  }

  const rows = [
    ['Battle ID', verification.battleId],
    ['Battle Type', verification.battleType],
    ['Content Hash', verification.contentHash],
    ['Entries Root', verification.entriesRoot],
    ['Rules Hash', verification.rulesHash],
    ['Winner Hash', verification.winnerHash],
    ['AI Verdict Hash', verification.aiVerdictHash],
    ['Mantle Tx', verification.mantleTx],
  ];

  return (
    <div className="mantle-verify-overlay" role="presentation">
      <section className="mantle-verify-modal" role="dialog" aria-modal="true" aria-labelledby="mantle-verify-title">
        <button className="mantle-verify-close" type="button" aria-label="Close Mantle verification" onClick={onClose}>
          X
        </button>
        <p className="mantle-verify-eyebrow">Verified on Mantle</p>
        <h2 id="mantle-verify-title">{battleTitle}</h2>
        <div className="mantle-verify-box">
          {rows.map(([label, value]) => (
            <div className="mantle-verify-row" key={label}>
              <span>{label}</span>
              <code>{value}</code>
            </div>
          ))}
        </div>
        <p className="mantle-verify-note">
          This receipt lets users check that the AI verdict was not casually rewritten by the server after the fight.
        </p>
        <a className="mantle-verify-link" href={verification.explorerUrl} target="_blank" rel="noreferrer">
          View on Mantle Explorer
        </a>
      </section>
    </div>
  );
}

type CreditChargePanelProps = {
  isOpen: boolean;
  isInfoOpen: boolean;
  currentCredits: number;
  walletAddress: string;
  packages: CreditPackage[];
  selectedPackage: CreditPackage | null;
  onClose: () => void;
  onToggleInfo: () => void;
  onCloseInfo: () => void;
  onSelectPackage: (creditPackage: CreditPackage) => void;
  onClosePayment: () => void;
  onApprovePayment: (creditPackage: CreditPackage) => void;
};

export function CreditChargePanel({
  isOpen,
  isInfoOpen,
  currentCredits,
  walletAddress,
  packages,
  selectedPackage,
  onClose,
  onToggleInfo,
  onCloseInfo,
  onSelectPackage,
  onClosePayment,
  onApprovePayment,
}: CreditChargePanelProps) {
  return (
    <section className={`credit-charge-panel${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      <div className="credit-charge-header">
        <h2>Refill Demo Credits</h2>
        <button className="credit-info-button" type="button" onClick={onToggleInfo}>What are these?</button>
        <button className="credit-panel-close" type="button" aria-label="Close demo credit refill" onClick={onClose}>X</button>
      </div>

      {isInfoOpen ? (
        <div className="credit-info-popover" role="dialog" aria-label="Demo credit explanation">
          <button type="button" aria-label="Close demo credit explanation" onClick={onCloseInfo}>X</button>
          <p>
            Pretend fuel for
            <br />
            <strong>very real arguments</strong>.
            <br />
            No financial advice,
            <br />
            only emotional invoices.
          </p>
        </div>
      ) : null}

      <div className="credit-owned-box">Current stash <strong>{currentCredits}</strong></div>

      <h3>Refill Packs</h3>
      <div className="credit-package-list">
        {packages.map((creditPackage) => (
          <button
            className="credit-package-row"
            type="button"
            key={creditPackage.credits}
            onClick={() => onSelectPackage(creditPackage)}
          >
            <span>Demo credits <strong>{creditPackage.credits}</strong></span>
            <strong>{creditPackage.price} MNT</strong>
          </button>
        ))}
      </div>

      <div className={`credit-payment-sheet${selectedPackage ? ' is-open' : ''}`} aria-hidden={!selectedPackage}>
        {selectedPackage ? (
          <>
            <div className="credit-payment-header">
              <h3>Checkout-ish</h3>
              <button type="button" aria-label="Close checkout-ish sheet" onClick={onClosePayment}>X</button>
            </div>
            <div className="credit-payment-summary">
              <div>
                <span>Demo credits {selectedPackage.credits}</span>
                <strong>{selectedPackage.price} MNT</strong>
              </div>
              <div>
                <span>Wallet</span>
                <span>{walletAddress}</span>
              </div>
            </div>
            <button className="credit-approve-button" type="button" onClick={() => onApprovePayment(selectedPackage)}>
              Ask Wallet Nicely
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

type CreditPurchaseCompleteModalProps = {
  creditTotal: number | null;
  onClose: () => void;
};

export function CreditPurchaseCompleteModal({ creditTotal, onClose }: CreditPurchaseCompleteModalProps) {
  return (
    <div className={`credit-complete-overlay${creditTotal !== null ? ' is-open' : ''}`} aria-hidden={creditTotal === null}>
      <section className="credit-complete-modal" role="dialog" aria-modal="true" aria-label="Demo credit refill complete">
        <button className="credit-complete-close" type="button" aria-label="Close refill complete popup" onClick={onClose}>X</button>
        <h2>Demo credits refilled!</h2>
        <p>Current stash <strong>{creditTotal ?? 0}</strong></p>
        <button className="credit-complete-confirm" type="button" onClick={onClose}>Nice</button>
      </section>
    </div>
  );
}
