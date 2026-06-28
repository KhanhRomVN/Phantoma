import { RouterProvider, createHashRouter } from 'react-router-dom';
import { routes } from './routes/routes';
import { ServerHealthProvider } from './providers/ServerHealthProvider';

function App() {
  const router = createHashRouter(routes);

  return (
    <ServerHealthProvider>
      <RouterProvider router={router} />
    </ServerHealthProvider>
  );
}

export default App;