import { ServerHealthProvider } from './providers/ServerHealthProvider';
import MainLayout from './layouts/MainLayout';
import ZoomOverlay from './components/ZoomOverlay';

function App() {
  return (
    <ServerHealthProvider>
      <MainLayout />
      <ZoomOverlay />
    </ServerHealthProvider>
  );
}

export default App;