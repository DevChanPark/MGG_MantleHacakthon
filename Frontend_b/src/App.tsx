import { useEffect, useState } from 'react';
import { OnboardingFeed } from './screens/OnboardingFeed';
import { SignupWalletScreen } from './screens/SignupWalletScreen';

export default function App() {
  const [route, setRoute] = useState(() => getRoute());

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route === 'signup') {
    return <SignupWalletScreen />;
  }

  return <OnboardingFeed />;
}

function getRoute() {
  return window.location.hash.replace('#', '');
}
