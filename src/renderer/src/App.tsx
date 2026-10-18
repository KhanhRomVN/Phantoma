import { useCallback, useState } from 'react';
import { ServerHealthProvider } from './providers/ServerHealthProvider';
import WelcomeScreen from './components/WelcomeScreen';
import MainLayout from './layouts/MainLayout';
import ZoomOverlay from './components/ZoomOverlay';

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const handleWelcomeDone = useCallback(() => setShowWelcome(false), []);

  return (
    <ServerHealthProvider>
      <MainLayout />
      <ZoomOverlay />
      {showWelcome && <WelcomeScreen onDone={handleWelcomeDone} />}
    </ServerHealthProvider>
  );
}

export default App;