import { useEffect, useState } from 'react';
import { OnboardingFeed } from './screens/OnboardingFeed';
import { HomeFeed } from './screens/HomeFeed';
import { ProfileScreen } from './screens/ProfileScreen';
import { SignupProfileScreen } from './screens/SignupProfileScreen';
import { SignupWalletScreen } from './screens/SignupWalletScreen';
import { CreateBattleScreen } from './screens/CreateBattleScreen';
import { AppShell } from './components/AppShell';
import type { CreateBattleType } from './components/BoardSelectSheet';
import { createMockBattle, initialMockBattles, type CreateBattleDraft } from './mocks/battles';

export default function App() {
  const [route, setRoute] = useState(() => getRoute());
  const [battles, setBattles] = useState(() => initialMockBattles);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleCreateBattle = (draft: CreateBattleDraft) => {
    const nextBattle = createMockBattle(draft);
    setBattles((currentBattles) => [nextBattle, ...currentBattles]);
    window.sessionStorage.setItem('mgg:homeFilter', draft.battleType);
    window.location.hash = 'home';
  };

  // Onboarding routes (no layout wrapper)
  if (route === 'signup') {
    return <SignupWalletScreen />;
  }

  if (route === 'signup-profile') {
    return <SignupProfileScreen />;
  }

  // App routes (with layout wrapper)
  if (route === 'home') {
    return (
      <AppShell>
        <HomeFeed battles={battles} />
      </AppShell>
    );
  }

  if (route === 'profile') {
    return (
      <AppShell>
        <ProfileScreen />
      </AppShell>
    );
  }

  if (route.startsWith('create')) {
    return (
      <AppShell>
        <CreateBattleScreen battleType={getCreateBattleType(route)} onCreateBattle={handleCreateBattle} />
      </AppShell>
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
