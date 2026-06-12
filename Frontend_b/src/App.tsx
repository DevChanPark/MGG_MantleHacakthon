import { useEffect, useState, type ReactNode } from 'react';
import { OnboardingFeed } from './screens/OnboardingFeed';
import { HomeFeed } from './screens/HomeFeed';
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
  createMockBattle,
  getMockBattleResult,
  initialMockBattles,
  type CreateBattleDraft,
  type FeedBattle,
} from './mocks/battles';

export default function App() {
  const [route, setRoute] = useState(() => getRoute());
  const [battles, setBattles] = useState(() => initialMockBattles);
  const [credits, setCredits] = useState(() => getInitialCredits());
  const [participatedBattleIds, setParticipatedBattleIds] = useState<string[]>([]);
  const [selectedOptionByBattleId, setSelectedOptionByBattleId] = useState<Record<string, string>>({});
  const [participationBattle, setParticipationBattle] = useState<FeedBattle | null>(null);
  const [isSelectionWarningOpen, setIsSelectionWarningOpen] = useState(false);
  const [winnerBattle, setWinnerBattle] = useState<FeedBattle | null>(null);
  const [rewardedBattleIds, setRewardedBattleIds] = useState<string[]>([]);
  const [isRewardCompleteOpen, setIsRewardCompleteOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem('mgg:credits', String(credits));
  }, [credits]);

  const handleCreateBattle = (draft: CreateBattleDraft) => {
    const nextBattle = createMockBattle(draft);
    setBattles((currentBattles) => [nextBattle, ...currentBattles]);
    window.sessionStorage.setItem('mgg:homeFilter', draft.battleType);
    window.location.hash = 'home';
  };

  const handleOptionSelect = (battleId: string, option: string) => {
    setSelectedOptionByBattleId((currentSelections) => ({
      ...currentSelections,
      [battleId]: option,
    }));
  };

  const handleParticipationRequest = (battle: FeedBattle) => {
    if (battle.status !== 'OPEN') {
      return;
    }

    if (battle.type === 'OPTION' && !selectedOptionByBattleId[battle.id]) {
      setIsSelectionWarningOpen(true);
      return;
    }

    setParticipationBattle(battle);
  };

  const handleSpendCredits = () => {
    if (!participationBattle || credits < PARTICIPATION_COST) {
      return;
    }

    setCredits((currentCredits) => currentCredits - PARTICIPATION_COST);
    setParticipatedBattleIds((currentIds) =>
      currentIds.includes(participationBattle.id) ? currentIds : [...currentIds, participationBattle.id],
    );
    setParticipationBattle(null);
  };

  const handleAddCredits = () => {
    setCredits((currentCredits) => currentCredits + 30);
  };

  const handleCloseBattle = (battleId: string) => {
    setBattles((currentBattles) =>
      currentBattles.map((battle) =>
        battle.id === battleId && battle.status === 'OPEN' ? { ...battle, status: 'EVALUATING' } : battle,
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
    setCredits((currentCredits) => currentCredits + result.rewardCredits);
    setRewardedBattleIds((currentIds) => [...currentIds, winnerBattle.id]);
    setWinnerBattle(null);
    setIsRewardCompleteOpen(true);
  };

  const renderWithAppShell = (children: ReactNode) => (
    <AppShell
      overlay={
        <>
          <ParticipationModal
            battle={participationBattle}
            credits={credits}
            isParticipated={participationBattle ? participatedBattleIds.includes(participationBattle.id) : false}
            onClose={() => setParticipationBattle(null)}
            onParticipate={handleSpendCredits}
            onAddCredits={handleAddCredits}
          />
          <SelectionRequiredModal isOpen={isSelectionWarningOpen} onClose={() => setIsSelectionWarningOpen(false)} />
          <WinnerModal
            battle={winnerBattle}
            result={winnerBattle ? getMockBattleResult(winnerBattle) : null}
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
        battles={battles}
        selectedOptionByBattleId={selectedOptionByBattleId}
        participatedBattleIds={participatedBattleIds}
        onOptionSelect={handleOptionSelect}
        onParticipationRequest={handleParticipationRequest}
        onCloseBattle={handleCloseBattle}
        onCompleteEvaluation={handleCompleteEvaluation}
        onOpenWinnerModal={handleOpenWinnerModal}
      />,
    );
  }

  if (route === 'profile') {
    return renderWithAppShell(<ProfileScreen />);
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

  return 30;
}
