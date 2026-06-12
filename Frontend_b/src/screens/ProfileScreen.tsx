import { useState } from 'react';

import commentFilledIcon from '../../assets/profile-icons/comment-filled.png';
import commentOutlineIcon from '../../assets/profile-icons/comment-outline.png';
import heartFilledIcon from '../../assets/profile-icons/heart-filled.png';
import heartOutlineIcon from '../../assets/profile-icons/heart-outline.png';
import shareIcon from '../../assets/profile-icons/share.png';
import stackIcon from '../../assets/profile-icons/stack.png';
import profileAvatar from '../../assets/profile-avatar.png';

const profilePosts = [
  {
    author: '우김장인',
    title: '지구가 평평한 이유',
    body: ['반박은 받습니다. 근데 어차피 제가 이김', 'AI도 제편임. 한 줄이면 충분한데 길게 쓰는 이유는', '길게 쓰면 더 맞는 말 같아서'],
    comments: [
      { author: '둥근말이 김밥', text: '지구가 둥글면 제 통장은 왜 평평한가요?', likes: 4, liked: true },
      { author: '평평주의자', text: '바다가 안쏟아지는 건 지구가 거대한 쟁반이라 그럼', likes: 2, liked: false },
    ],
  },
  {
    author: '새벽감성러',
    title: '과제 마감이 새벽에만 존재하는 이유',
    body: ['낮에는 존재감 없다가 밤만 되면 갑자기 세계관 최강자처럼 나타남'],
    comments: [],
  },
];

type ProfileContentTab = 'posts' | 'comments' | 'likes';
type ProfileBattleFilter = 'open' | 'option' | 'image';

type CreditPackage = {
  credits: number;
  price: number;
};

const creditPackages: CreditPackage[] = [
  { credits: 10, price: 10 },
  { credits: 30, price: 30 },
  { credits: 50, price: 50 },
  { credits: 100, price: 100 },
  { credits: 200, price: 200 },
  { credits: 300, price: 300 },
];

export function ProfileScreen() {
  const [activeContentTab, setActiveContentTab] = useState<ProfileContentTab>('posts');
  const [activeBattleFilter, setActiveBattleFilter] = useState<ProfileBattleFilter>('open');
  const [currentCredits, setCurrentCredits] = useState(30);
  const [isCreditPanelOpen, setIsCreditPanelOpen] = useState(false);
  const [isCreditInfoOpen, setIsCreditInfoOpen] = useState(false);
  const [selectedCreditPackage, setSelectedCreditPackage] = useState<CreditPackage | null>(null);
  const [completedCreditTotal, setCompletedCreditTotal] = useState<number | null>(null);

  const closeCreditPanel = () => {
    setIsCreditPanelOpen(false);
    setIsCreditInfoOpen(false);
    setSelectedCreditPackage(null);
  };

  const approveCreditPurchase = (creditPackage: CreditPackage) => {
    const nextCreditTotal = currentCredits + creditPackage.credits;
    setCurrentCredits(nextCreditTotal);
    closeCreditPanel();
    setCompletedCreditTotal(nextCreditTotal);
  };

  return (
    <main className="profile-feed" aria-label="MGG profile page">
      <section className="profile-summary" aria-label="프로필 요약">
        <img className="profile-avatar" src={profileAvatar} alt="" />
        <div className="profile-copy">
          <h1>우기기 장인</h1>
          <p>
            말 안 되는 주장도 끝까지 밀어붙이는 중
            <br />
            ㅋㅋ 영크크영크크영크크
          </p>
        </div>
      </section>

      <button className="profile-edit-button" type="button">프로필 수정</button>

      <button className="profile-credit-row" type="button" onClick={() => setIsCreditPanelOpen((isOpen) => !isOpen)}>
        <span>내 크레딧 <strong>{currentCredits}개</strong></span>
        <span>충전하기</span>
      </button>

      <nav className="profile-content-tabs" aria-label="프로필 콘텐츠 분류">
        <button
          className={activeContentTab === 'posts' ? 'is-active' : ''}
          type="button"
          aria-label="내가 만든 글"
          aria-pressed={activeContentTab === 'posts'}
          onClick={() => setActiveContentTab('posts')}
        >
          <img className="profile-tab-icon-img profile-tab-stack-img" src={stackIcon} alt="" aria-hidden="true" />
        </button>
        <button
          className={activeContentTab === 'comments' ? 'is-active' : ''}
          type="button"
          aria-label="댓글"
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
          className={activeContentTab === 'likes' ? 'is-active' : ''}
          type="button"
          aria-label="좋아요"
          aria-pressed={activeContentTab === 'likes'}
          onClick={() => setActiveContentTab('likes')}
        >
          <img
            className="profile-tab-icon-img profile-tab-heart-img"
            src={activeContentTab === 'likes' ? heartFilledIcon : heartOutlineIcon}
            alt=""
            aria-hidden="true"
          />
        </button>
      </nav>

      <div className="profile-type-filters" aria-label="배틀 유형 필터">
        <button
          className={activeBattleFilter === 'open' ? 'is-active' : ''}
          type="button"
          aria-pressed={activeBattleFilter === 'open'}
          onClick={() => setActiveBattleFilter('open')}
        >
          오픈 답변형
        </button>
        <button
          className={activeBattleFilter === 'option' ? 'is-active' : ''}
          type="button"
          aria-pressed={activeBattleFilter === 'option'}
          onClick={() => setActiveBattleFilter('option')}
        >
          선택지형
        </button>
        <button
          className={activeBattleFilter === 'image' ? 'is-active' : ''}
          type="button"
          aria-pressed={activeBattleFilter === 'image'}
          onClick={() => setActiveBattleFilter('image')}
        >
          이미지형
        </button>
      </div>

      <section className="profile-post-list" aria-label="내 게시글">
        {profilePosts.map((post, index) => (
          <article className="profile-post-card" key={post.title}>
            <div className="profile-post-avatar" aria-hidden="true" />
            <div className="profile-post-content">
              <p className="profile-post-author">{post.author}</p>
              <h2>{post.title}</h2>
              {post.body.map((line) => (
                <p className="profile-post-body" key={line}>{line}</p>
              ))}
            </div>

            <div className="profile-post-actions" aria-label="게시글 반응">
              <span><img className="profile-action-icon profile-action-comment" src={commentFilledIcon} alt="" aria-hidden="true" /> 댓글 3</span>
              <span><img className="profile-action-icon profile-action-heart" src={heartFilledIcon} alt="" aria-hidden="true" /> 좋아요 24</span>
              <span><img className="profile-action-icon profile-action-share" src={shareIcon} alt="" aria-hidden="true" /> 공유하기</span>
            </div>

            {index === 0 ? (
              <div className="profile-comments-box">
                <p className="profile-comments-title">댓글 3</p>
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
        ))}
      </section>

      <CreditChargePanel
        isOpen={isCreditPanelOpen}
        isInfoOpen={isCreditInfoOpen}
        currentCredits={currentCredits}
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
    </main>
  );
}

type CreditChargePanelProps = {
  isOpen: boolean;
  isInfoOpen: boolean;
  currentCredits: number;
  packages: CreditPackage[];
  selectedPackage: CreditPackage | null;
  onClose: () => void;
  onToggleInfo: () => void;
  onCloseInfo: () => void;
  onSelectPackage: (creditPackage: CreditPackage) => void;
  onClosePayment: () => void;
  onApprovePayment: (creditPackage: CreditPackage) => void;
};

function CreditChargePanel({
  isOpen,
  isInfoOpen,
  currentCredits,
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
        <h2>크레딧 충전</h2>
        <button className="credit-info-button" type="button" onClick={onToggleInfo}>크레딧이란?</button>
        <button className="credit-panel-close" type="button" aria-label="크레딧 충전 닫기" onClick={onClose}>×</button>
      </div>

      {isInfoOpen ? (
        <div className="credit-info-popover" role="dialog" aria-label="크레딧 설명">
          <button type="button" aria-label="크레딧 설명 닫기" onClick={onCloseInfo}>×</button>
          <p>
            MGG 참여를 위해 필요한
            <br />
            <strong>전용 결제수단</strong>입니다.
            <br />
            크레딧을 미리 구매하시면 복잡한
            <br />
            결제 과정이 간단해집니다.
          </p>
        </div>
      ) : null}

      <div className="credit-owned-box">현재 보유한 크레딧 <strong>{currentCredits}개</strong></div>

      <h3>충전 패키지</h3>
      <div className="credit-package-list">
        {packages.map((creditPackage) => (
          <button
            className="credit-package-row"
            type="button"
            key={creditPackage.credits}
            onClick={() => onSelectPackage(creditPackage)}
          >
            <span>크레딧 <strong>{creditPackage.credits}개</strong></span>
            <strong>{creditPackage.price} MNT</strong>
          </button>
        ))}
      </div>

      <div className={`credit-payment-sheet${selectedPackage ? ' is-open' : ''}`} aria-hidden={!selectedPackage}>
        {selectedPackage ? (
          <>
            <div className="credit-payment-header">
              <h3>결제하기</h3>
              <button type="button" aria-label="결제창 닫기" onClick={onClosePayment}>×</button>
            </div>
            <div className="credit-payment-summary">
              <div>
                <span>크레딧 {selectedPackage.credits}개</span>
                <strong>{selectedPackage.price} MNT</strong>
              </div>
              <div>
                <span>지갑주소</span>
                <span>0x~~~~~~~~~~~~~~~~</span>
              </div>
            </div>
            <button className="credit-approve-button" type="button" onClick={() => onApprovePayment(selectedPackage)}>
              승인 요청하기
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

function CreditPurchaseCompleteModal({ creditTotal, onClose }: CreditPurchaseCompleteModalProps) {
  return (
    <div className={`credit-complete-overlay${creditTotal !== null ? ' is-open' : ''}`} aria-hidden={creditTotal === null}>
      <section className="credit-complete-modal" role="dialog" aria-modal="true" aria-label="크레딧 구매 완료">
        <button className="credit-complete-close" type="button" aria-label="구매 완료 팝업 닫기" onClick={onClose}>×</button>
        <h2>크레딧 구매가 완료되었습니다!</h2>
        <p>현재 보유한 크레딧 <strong>{creditTotal ?? 0}개</strong></p>
        <button className="credit-complete-confirm" type="button" onClick={onClose}>확인</button>
      </section>
    </div>
  );
}
