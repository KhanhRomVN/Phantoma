import { ServerHealthProvider } from './providers/ServerHealthProvider';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <ServerHealthProvider>
      <MainLayout />
    </ServerHealthProvider>
  );
}

export default App;