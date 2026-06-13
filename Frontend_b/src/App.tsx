import { useEffect, useState, type ReactNode } from 'react';
import { OnboardingFeed } from './screens/OnboardingFeed';
import { HomeFeed } from './screens/HomeFeed';
import { BattleDetailScreen } from './screens/BattleDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SignupProfileScreen } from './screens/SignupProfileScreen';
import { SignupWalletScreen } from './screens/SignupWalletScreen';
import { CreateBattleScreen } from './screens/CreateBattleScreen';
import { AppShell } from './components/AppShell';
import type { CreateBattleType } from './components/BoardSelectSheet';
import {
  PARTICIPATION_COST,
  ParticipationModal,
  SelectionRequiredModal,
} from './components/ParticipationModal';
import { RewardCompleteModal, WinnerModal } from './components/RewardModal';
import {
  canParticipateInBattle,
  createMockBattle,
  getBattleEffectiveStatus,
  getMockBattleResult,
  initialMockBattles,
  isCurrentUserWinner,
  MOCK_CURRENT_USER,
  MOCK_WALLET_ADDRESS,
  type CreateBattleDraft,
  type BattleType,
  type FeedBattle,
} from './mocks/battles';

export default function App() {
  const [route, setRoute] = useState(() => getRoute());
  const [battles, setBattles] = useState(() => initialMockBattles);
  const [homeFilter, setHomeFilter] = useState<BattleType>(() => getSavedBattleType());
  const [credits, setCredits] = useState(() => getInitialCredits());
  const [likedBattleIds, setLikedBattleIds] = useState<string[]>([]);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [participatedBattleIds, setParticipatedBattleIds] = useState<string[]>([]);
  const [selectedOptionByBattleId, setSelectedOptionByBattleId] = useState<Record<string, string>>({});
  const [participationBattle, setParticipationBattle] = useState<FeedBattle | null>(null);
  const [pendingParticipationOption, setPendingParticipationOption] = useState('');
  const [isSelectionWarningOpen, setIsSelectionWarningOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('진영을 먼저 선택해주세요.');
  const [winnerBattle, setWinnerBattle] = useState<FeedBattle | null>(null);
  const [rewardedBattleIds, setRewardedBattleIds] = useState<string[]>([]);
  const [isRewardCompleteOpen, setIsRewardCompleteOpen] = useState(false);

  const visibleBattles = battles.map((battle) => ({
    ...battle,
    status: getBattleEffectiveStatus(battle),
  }));

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem('mgg:credits', String(credits));
  }, [credits]);

  useEffect(() => {
    const appContent = document.querySelector('.app-content');

    if (appContent instanceof HTMLElement) {
      appContent.scrollTo({ top: 0, left: 0 });
    }

    window.scrollTo({ top: 0, left: 0 });
  }, [route]);

  const handleCreateBattle = (draft: CreateBattleDraft) => {
    const nextBattle = createMockBattle(draft);
    setBattles((currentBattles) => [nextBattle, ...currentBattles]);
    setHomeFilter(draft.battleType);
    window.sessionStorage.setItem('mgg:homeFilter', draft.battleType);
    window.location.hash = 'home';
  };

  const handleOptionSelect = (battleId: string, option: string) => {
    const battle = visibleBattles.find((currentBattle) => currentBattle.id === battleId);

    if (!battle || !canParticipateInBattle(battle)) {
      showNotice('마감된 게시글입니다.');
      return;
    }

    if (!participatedBattleIds.includes(battleId)) {
      showNotice('참여하기를 눌러야 선택할 수 있습니다.');
      return;
    }

    setSelectedOptionByBattleId((currentSelections) => ({
      ...currentSelections,
      [battleId]: option,
    }));
  };

  const handleBattleLike = (battleId: string) => {
    const wasLiked = likedBattleIds.includes(battleId);

    setBattles((currentBattles) =>
      currentBattles.map((battle) =>
        battle.id === battleId ? { ...battle, likeCount: battle.likeCount + (wasLiked ? -1 : 1) } : battle,
      ),
    );

    setLikedBattleIds((currentIds) =>
      wasLiked ? currentIds.filter((currentId) => currentId !== battleId) : [...currentIds, battleId],
    );
  };

  const handleCommentLike = (battleId: string, commentId: string) => {
    const wasLiked = likedCommentIds.includes(commentId);

    setBattles((currentBattles) =>
      currentBattles.map((battle) =>
        battle.id === battleId
          ? {
              ...battle,
              comments: battle.comments.map((comment) =>
                comment.id === commentId
                  ? { ...comment, likeCount: comment.likeCount + (wasLiked ? -1 : 1) }
                  : comment,
              ),
            }
          : battle,
      ),
    );

    setLikedCommentIds((currentIds) =>
      wasLiked ? currentIds.filter((currentId) => currentId !== commentId) : [...currentIds, commentId],
    );
  };

  const handleCommentAdd = (battleId: string, text: string) => {
    const nextComment = text.trim();
    const battle = visibleBattles.find((currentBattle) => currentBattle.id === battleId);

    if (!nextComment) {
      return;
    }

    if (!battle || !canParticipateInBattle(battle)) {
      showNotice('마감된 게시글입니다.');
      return;
    }

    if (!participatedBattleIds.includes(battleId)) {
      showNotice('참여하기를 눌러야 댓글을 등록할 수 있습니다.');
      return;
    }

    setBattles((currentBattles) =>
      currentBattles.map((battle) =>
        battle.id === battleId
          ? {
              ...battle,
              comments: [
                ...battle.comments,
                {
                  id: `${battle.id}-local-comment-${Date.now()}`,
                  author: '나',
                  text: nextComment,
                  likeCount: 0,
                },
              ],
            }
          : battle,
      ),
    );
  };

  const handleParticipationRequest = (battle: FeedBattle) => {
    const effectiveBattle = {
      ...battle,
      status: getBattleEffectiveStatus(battle),
    };

    if (!canParticipateInBattle(effectiveBattle)) {
      showNotice('마감된 게시글입니다.');
      return;
    }

    setPendingParticipationOption('');
    setParticipationBattle(effectiveBattle);
  };

  const handleSpendCredits = () => {
    if (!participationBattle || credits < PARTICIPATION_COST) {
      return;
    }

    if (participationBattle.type === 'OPTION' && !pendingParticipationOption) {
      showNotice('진영을 먼저 선택해주세요.');
      return;
    }

    setCredits((currentCredits) => currentCredits - PARTICIPATION_COST);
    if (participationBattle.type === 'OPTION') {
      setSelectedOptionByBattleId((currentSelections) => ({
        ...currentSelections,
        [participationBattle.id]: pendingParticipationOption,
      }));
    }
    setParticipatedBattleIds((currentIds) =>
      currentIds.includes(participationBattle.id) ? currentIds : [...currentIds, participationBattle.id],
    );
    setPendingParticipationOption('');
    setParticipationBattle(null);
  };

  const handleAddCredits = (amount: number) => {
    setCredits((currentCredits) => currentCredits + amount);
  };

  const handleRequireParticipation = () => {
    showNotice('참여하기를 눌러야 댓글을 등록할 수 있습니다.');
  };

  const handleShareBattle = () => {
    showNotice('공유 링크가 준비되었습니다.');
  };

  const showNotice = (message: string) => {
    setNoticeMessage(message);
    setIsSelectionWarningOpen(true);
  };

  const handleCloseBattle = (battleId: string) => {
    setBattles((currentBattles) =>
      currentBattles.map((battle) =>
        battle.id === battleId && getBattleEffectiveStatus(battle) === 'OPEN'
          ? { ...battle, status: 'EVALUATING' }
          : battle,
      ),
    );
  };

  const handleCompleteEvaluation = (battleId: string) => {
    const targetBattle = battles.find((battle) => battle.id === battleId);
    const completedBattle: FeedBattle | null = targetBattle ? { ...targetBattle, status: 'COMPLETED' } : null;

    setBattles((currentBattles) =>
      currentBattles.map((battle) => (battle.id === battleId ? { ...battle, status: 'COMPLETED' } : battle)),
    );

    if (completedBattle && !rewardedBattleIds.includes(completedBattle.id)) {
      setWinnerBattle(completedBattle);
    }
  };

  const handleOpenWinnerModal = (battle: FeedBattle) => {
    if (battle.status === 'COMPLETED') {
      setWinnerBattle(battle);
    }
  };

  const handleClaimReward = () => {
    if (!winnerBattle || rewardedBattleIds.includes(winnerBattle.id)) {
      return;
    }

    const result = getMockBattleResult(winnerBattle);
    if (!isCurrentUserWinner(result, MOCK_CURRENT_USER.id)) {
      return;
    }

    setCredits((currentCredits) => currentCredits + result.rewardCredits);
    setRewardedBattleIds((currentIds) => [...currentIds, winnerBattle.id]);
    setWinnerBattle(null);
    setIsRewardCompleteOpen(true);
  };

  const renderWithAppShell = (children: ReactNode, options: { hideHeader?: boolean } = {}) => (
    <AppShell
      hideHeader={options.hideHeader}
      overlay={
        <>
          <ParticipationModal
            battle={participationBattle}
            credits={credits}
            walletAddress={MOCK_WALLET_ADDRESS}
            isParticipated={participationBattle ? participatedBattleIds.includes(participationBattle.id) : false}
            selectedOption={pendingParticipationOption}
            onClose={() => {
              setPendingParticipationOption('');
              setParticipationBattle(null);
            }}
            onOptionSelect={setPendingParticipationOption}
            onParticipate={handleSpendCredits}
            onAddCredits={handleAddCredits}
          />
          <SelectionRequiredModal
            isOpen={isSelectionWarningOpen}
            message={noticeMessage}
            onClose={() => setIsSelectionWarningOpen(false)}
          />
          <WinnerModal
            battle={winnerBattle}
            result={winnerBattle ? getMockBattleResult(winnerBattle) : null}
            currentUserId={MOCK_CURRENT_USER.id}
            currentUserNickname={MOCK_CURRENT_USER.nickname}
            isRewarded={winnerBattle ? rewardedBattleIds.includes(winnerBattle.id) : false}
            onClose={() => setWinnerBattle(null)}
            onClaimReward={handleClaimReward}
          />
          <RewardCompleteModal isOpen={isRewardCompleteOpen} onClose={() => setIsRewardCompleteOpen(false)} />
        </>
      }
    >
      {children}
    </AppShell>
  );

  // Onboarding routes (no layout wrapper)
  if (route === 'signup') {
    return <SignupWalletScreen />;
  }

  if (route === 'signup-profile') {
    return <SignupProfileScreen />;
  }

  // App routes (with layout wrapper)
  if (route === 'home') {
    return renderWithAppShell(
      <HomeFeed
        battles={visibleBattles}
        activeFilter={homeFilter}
        selectedOptionByBattleId={selectedOptionByBattleId}
        participatedBattleIds={participatedBattleIds}
        likedBattleIds={likedBattleIds}
        likedCommentIds={likedCommentIds}
        onFilterChange={setHomeFilter}
        onOptionSelect={handleOptionSelect}
        onBattleLike={handleBattleLike}
        onCommentLike={handleCommentLike}
        onCommentAdd={handleCommentAdd}
        onShareBattle={handleShareBattle}
        onRequireParticipation={handleRequireParticipation}
        onParticipationRequest={handleParticipationRequest}
        onCloseBattle={handleCloseBattle}
        onCompleteEvaluation={handleCompleteEvaluation}
        onOpenWinnerModal={handleOpenWinnerModal}
        onOpenDetail={(battleId) => {
          window.location.hash = `battle/${battleId}`;
        }}
      />,
    );
  }

  if (route.startsWith('battle/')) {
    const battleId = route.split('/')[1];
    const selectedBattle = visibleBattles.find((battle) => battle.id === battleId);

    if (!selectedBattle) {
      window.location.hash = 'home';
      return null;
    }

    return renderWithAppShell(
      <BattleDetailScreen
        battle={selectedBattle}
        selectedOption={selectedOptionByBattleId[selectedBattle.id] ?? null}
        isParticipated={participatedBattleIds.includes(selectedBattle.id)}
        isBattleLiked={likedBattleIds.includes(selectedBattle.id)}
        likedCommentIds={likedCommentIds}
        onBack={() => {
          window.location.hash = 'home';
        }}
        onOptionSelect={(option) => handleOptionSelect(selectedBattle.id, option)}
        onBattleLike={() => handleBattleLike(selectedBattle.id)}
        onCommentLike={(commentId) => handleCommentLike(selectedBattle.id, commentId)}
        onCommentAdd={(text) => handleCommentAdd(selectedBattle.id, text)}
        onShareBattle={handleShareBattle}
        onRequireParticipation={handleRequireParticipation}
        onParticipationRequest={() => handleParticipationRequest(selectedBattle)}
        onCloseBattle={() => handleCloseBattle(selectedBattle.id)}
        onCompleteEvaluation={() => handleCompleteEvaluation(selectedBattle.id)}
        onOpenWinnerModal={() => handleOpenWinnerModal(selectedBattle)}
      />,
    );
  }

  if (route === 'profile') {
    return renderWithAppShell(
      <ProfileScreen credits={credits} walletAddress={MOCK_WALLET_ADDRESS} onAddCredits={handleAddCredits} />,
      { hideHeader: true },
    );
  }

  if (route.startsWith('create')) {
    return renderWithAppShell(
      <CreateBattleScreen battleType={getCreateBattleType(route)} onCreateBattle={handleCreateBattle} />,
    );
  }

  return <OnboardingFeed />;
}

function getRoute() {
  return window.location.hash.replace('#', '') || 'home';
}

function getSavedBattleType(): BattleType {
  const savedType = window.sessionStorage.getItem('mgg:homeFilter');

  if (savedType === 'OPTION' || savedType === 'IMAGE_CAPTION' || savedType === 'TEXT_OPEN') {
    return savedType;
  }

  return 'TEXT_OPEN';
}

function getCreateBattleType(route: string): CreateBattleType {
  const routeType = route.split('/')[1];

  if (routeType === 'OPTION' || routeType === 'IMAGE_CAPTION' || routeType === 'TEXT_OPEN') {
    return routeType;
  }

  const savedType = window.sessionStorage.getItem('mgg:selectedBattleType');

  if (savedType === 'OPTION' || savedType === 'IMAGE_CAPTION' || savedType === 'TEXT_OPEN') {
    return savedType;
  }

  return 'TEXT_OPEN';
}

function getInitialCredits() {
  const queryCredits = Number(new URLSearchParams(window.location.search).get('mockCredits'));

  if (Number.isFinite(queryCredits) && queryCredits >= 0) {
    return queryCredits;
  }

  const savedCredits = Number(window.sessionStorage.getItem('mgg:credits'));

  if (Number.isFinite(savedCredits) && savedCredits >= 0) {
    return savedCredits;
  }

  return MOCK_CURRENT_USER.credits;
}
