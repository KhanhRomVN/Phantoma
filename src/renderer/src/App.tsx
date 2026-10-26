import { useCallback, useState } from 'react';
import { ServerHealthProvider } from './providers/ServerHealthProvider';
import WelcomeScreen from './components/WelcomeScreen';
import MainLayout from './layouts/MainLayout';
import ZoomOverlay from './components/ZoomOverlay';
import UnsavedGuard from './shared/unsaved/UnsavedGuard';

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const handleWelcomeDone = useCallback(() => setShowWelcome(false), []);

  return (
    <ServerHealthProvider>
      <MainLayout />
      <ZoomOverlay />
      <UnsavedGuard />
      {showWelcome && <WelcomeScreen onDone={handleWelcomeDone} />}
    </ServerHealthProvider>
  );
}

export default App;