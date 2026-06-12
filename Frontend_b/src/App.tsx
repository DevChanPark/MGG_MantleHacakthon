import { useEffect, useState } from 'react';
import { OnboardingFeed } from './screens/OnboardingFeed';
import { HomeFeed } from './screens/HomeFeed';
import { ProfileScreen } from './screens/ProfileScreen';
import { SignupProfileScreen } from './screens/SignupProfileScreen';
import { SignupWalletScreen } from './screens/SignupWalletScreen';
import { CreateBattleScreen } from './screens/CreateBattleScreen';
import { AppShell } from './components/AppShell';

export default function App() {
  const [route, setRoute] = useState(() => getRoute());

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
        <HomeFeed />
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

  if (route === 'create') {
    return (
      <AppShell>
        <CreateBattleScreen />
      </AppShell>
    );
  }

  return <OnboardingFeed />;
}

function getRoute() {
  return window.location.hash.replace('#', '') || 'home';
}
